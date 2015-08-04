'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash'),
    moment = require('moment-timezone');

/**
 * Constructor for PipelineVarsBuilder object, which translates API request
 * path params into MongoDB Aggregation Pipeline-compatible objects.
 *
 * Use `pathParams` to provide array of expected path parameters. Any path params
 * found will be use in 'group' and 'match', so query results will be filtered
 * to match desired param value, and will be grouped by corresponding field.
 *
 * Use `queryParams` to pass in non-hierarchical dimensions by which you wish
 * to filter query results.  Resulting data will not be grouped by these dimensions
 * unless specified using the `groupBy` query parameter.
 *
 * !!!NOTE!!!: When grouped by date unit, converts all dates to user's timezone before returning
 * so no conversion is necessary on client side
 *
 * Additionally, you can pass in comma-separated values for any queryParam, and you
 * get access to the following operators which are passed directly to $match step
 * in the MongoDB Aggregation Pipeline
 *
 *  - {in} element in array
 *  - {nin} element not in array
 *  - {ne} matches any row with field val not equal to query val
 *
 * SPECIAL QUERY PARAMS:
 *  - startDate: (inclusive) accepts ISO formatted datetimes, assumed to be UTC (e.g. '1995-12-17T03:24:00')
 *  - endDate: (exclusive) accepts ISO formatted datetimes, assumed to be UTC (e.g. '1995-12-17T03:24:00')
 *  - groupBy: single value or CSV containing additional fields to group by. NOTE: DO NOT INCLUDE DATE FIELD, use
 *          dateGroupBy param instead
 *  - dateGroupBy: 'hour', 'day', 'month' or 'year'
 *
 * @param {Array} pathParams
 * @param {Array} queryParams
 * @param {String} dateFieldName name of date field in aggregation model, default is 'hour'
 * @constructor
 */
var HourlyAggregationPipelineVarBuilder = function(pathParams, queryParams, dateFieldName){
    this.pathParams = pathParams;
    this.queryParams = queryParams;
    this.dateFieldName = dateFieldName || 'hour';
    this.queryParamOperators = ['in','nin','ne'];
    this.tzOffset = null;
};

/**
 * Handles parsing of operator & comma-separated query values
 *
 * Returns either parsed value, or if a recognized operator is used, object
 * with Mongo-compatible operator (i.e. prefixed with '$') as key.
 *
 * @param val
 * @returns {*}
 * @private
 */
HourlyAggregationPipelineVarBuilder.prototype._parseQueryParam = function(val){
    // first parse out operator & val
    var operator = val.match(/\{(.*)\}/);
    val = val.replace(/\{(.*)\}/, '');
    // try to parse value as array if a comma found
    // Should go without saying that you SHOULDN'T USE COMMAS IN QUERY PARAMS
    if (val.indexOf(',') > -1){
        val = JSON.parse("[" + val + "]");
    }
    if (operator){
        operator = operator[1];
        if (this.queryParamOperators.indexOf(operator) > -1){
            operator = '$' + operator
        } else {
            throw new Error('Unknown operator: ' + operator)
        }
        return { operator: val }
    } else {
        return val
    }
};

/**
 * Creates $match object to pass to aggregation pipeline.
 * @param req
 */
HourlyAggregationPipelineVarBuilder.prototype.getMatch = function(req){
    // Match path params first
    var match = {};
    var self = this;
    this.pathParams.forEach(function(param){
        if (req.param(param)){
            match[param] = req.param(param)
        }
    });
    // Now parse query params & add to match, if passed in
    // Parsing includes parsing out {} operators as well, and coercing
    // comma-separated strings to arrays
    this.queryParams.forEach(function(queryParam){
        if (req.query[queryParam]){
            match[queryParam] = self._parseQueryParam(req.query[queryParam]);
        }
    });
    // Handle date query params & add to match step if provided
    if (req.query.hasOwnProperty('startDate')) {
        try {
            match.hour = { $gte: new Date(req.query.startDate) };
        } catch (e) {
            throw new Error('Invalid startDate, cannot parse to Date object');
        }
    }
    if (req.query.hasOwnProperty('endDate')) {
        try {
            if (match.hour){
                match.hour.$lt = new Date(req.query.endDate);
            } else {
                match.hour = { $lt: new Date(req.query.endDate) }
            }
        } catch (e) {
            throw new Error('Invalid endDate, cannot parse to Date object');
        }
    }
    return match;
};

/**
 * Creates $group object to pass to aggregation pipeline.
 *
 * NOTE: Converts all DB dates user's timezone (offset determined based off current date)
 * BEFORE grouping, so all groupings reflect user's timezone
 * @param req
 */
HourlyAggregationPipelineVarBuilder.prototype.getGroup = function(req){
    var group = {};
    var self = this;

    // This assumes you want the field names to persist in grouped query results
    //
    // Also could potentially just group by lower-level hierarchical
    // entity and get the same results but do it this way for completeness.
    // Might want to reevaluate if this causes performance issues.
    this.pathParams.forEach(function(param){
        if (req.param(param)){
            group[param] = '$' + param;
        }
    });

    // Now parse groupBy param, which can either CSV or single field
    var groupBy = req.query.groupBy;
    if (groupBy){
        if (groupBy.indexOf(',') > -1){
            groupBy = JSON.parse("[" + groupBy + "]");
            groupBy.forEach(function(field){
                group[field] = '$' + field;
            })
        } else {
            group[groupBy] = '$' + groupBy;
        }
    }
    // Handle dateGroupBy directives

    // TODO: currently setting timezone offset based on offset for current time.
    // TODO: Need to fix, this is kind of shitty
    var offset_minutes = moment.tz.zone(req.user.tz).offset(new Date());
    var offset_ms = offset_minutes * 60 * 1000;
    var dateFieldName = '$' + self.dateFieldName;
    var date_groupings = {
        hour: {
            hour: { $hour: [{ $subtract: [dateFieldName,offset_ms]}]},
            month: { $month: [{ $subtract: [dateFieldName,offset_ms]}]},
            day: { $dayOfMonth: [{ $subtract: [dateFieldName,offset_ms]}]},
            year: { $year: [{ $subtract: [dateFieldName,offset_ms]}]}
        },
        day: {
            month: { $month: [{ $subtract: [dateFieldName,offset_ms]}]},
            day: { $dayOfMonth: [{ $subtract: [dateFieldName,offset_ms]}]},
            year: { $year: [{ $subtract: [dateFieldName,offset_ms]}]}
        },
        month: {
            month: { $month: [{ $subtract: [dateFieldName,offset_ms]}]},
            year: { $year: [{ $subtract: [dateFieldName,offset_ms]}]}
        },
        year: {
            year: { $year: [{ $subtract: [dateFieldName,offset_ms]}]}
        }
    };
    if (req.query.dateGroupBy){
        group.date = date_groupings[req.query.dateGroupBy];
    }
    return group;
};

/**
 * Lightweight object to expose query methods to API routes.
 *
 * @param aggregationModels
 * @constructor
 */
var HourlyAdStatAPI = function(aggregationModels){
    this.aggregationModels = aggregationModels;
    this.adv_params = ['advertiser','campaign','creativegroup','creative'];
    this.pub_params = ['publisher','site','page','placement'];
    this.clique_params = ['pub_clique', 'adv_clique'];
    this.advPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.adv_params, this.pub_params, 'hour');
    this.pubPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.pub_params, this.adv_params, 'hour');
    this.cliquePipelineBuilder = new HourlyAggregationPipelineVarBuilder([], this.clique_params, 'hour');
};
HourlyAdStatAPI.prototype._getManyWrapper = function(pipelineBuilder){
    var self = this;
    return function (req, res) {
        try {
            var group = pipelineBuilder.getGroup(req);
        } catch (e) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(e)
            });
        }
        try {
            var match = pipelineBuilder.getMatch(req);
        } catch (e) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(e)
            });
        }
        self.aggregationModels.HourlyAdStat
            .aggregate([
                { $match: match },
                { $sort: { hour: -1 }}, //I thought this sorts descending but apparently doesn't??
                { $group: {
                        _id: group,
                        bids: {$sum: "$bids"},
                        imps: {$sum: "$imps"},
                        spend: {$sum: "$spend"},
                        clicks: {$sum: "$clicks"},
                        view_convs: {$sum: "$view_convs"},
                        click_convs: {$sum: "$click_convs"}
                    }
                }
            ])
            .exec(function(err, hourlyAdStats){
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.json(hourlyAdStats);
                }
            });
    }
};
// BEGIN actual methods to expose to API routes.
HourlyAdStatAPI.prototype.getManyAdvertiser = function(req, res){
    return this._getManyWrapper(this.advPipelineBuilder)(req, res);
};
HourlyAdStatAPI.prototype.getManyPublisher = function(req, res){
    return this._getManyWrapper(this.pubPipelineBuilder)(req, res);
};
HourlyAdStatAPI.prototype.getManyClique = function(req, res){
    return this._getManyWrapper(this.cliquePipelineBuilder)(req, res);
};


module.exports = function(db) {
    var aggregationModels = new models.AggregationModels(db);
    var hourlyAdStatAPI = new HourlyAdStatAPI(aggregationModels);
    return {
        hourlyAdStat: {
            getManyAdvertiser: function (req, res) {
                return hourlyAdStatAPI.getManyAdvertiser(req, res);
            },
            getManyPublisher: function (req, res) {
                return hourlyAdStatAPI.getManyPublisher(req, res);
            },
            getManyClique: function (req, res) {
                return hourlyAdStatAPI.getManyClique(req, res);
            }
        }
    };
};