'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

/**
 * Constructor for PipelineVarsBuilder object, which translates API request
 * path params into MongoDB Aggregation Pipeline-compatible objects.
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
};
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
 *
 * Matches all path params, as well as the following:
 *
 *  - startDate: [inclusive] accepts ISO formatted datetimes, assumed to be UTC (e.g. '1995-12-17T03:24:00')
 *  - endDate: [exclusive] accepts ISO formatted datetimes, assumed to be UTC (e.g. '1995-12-17T03:24:00')
 *
 *
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
            match.hour.$gte = new Date(req.query.startDate);
        } catch (e) {
            throw new Error('Invalid startDate, cannot parse to Date object');
        }
    }
    if (req.query.hasOwnProperty('endDate')) {
        try {
            match.hour.$lt = new Date(req.query.endDate);
        } catch (e) {
            throw new Error('Invalid endDate, cannot parse to Date object');
        }
    }
    return match;
};

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
        }
    }
    // Handle dateGroupBy directives
    var dateFieldName = '$' + self.dateFieldName;
    var date_groupings = {
        hour: {
            hour: { $hour: dateFieldName },
            month: { $month: dateFieldName },
            day: { $dayOfMonth: dateFieldName },
            year: { $year: dateFieldName }
        },
        day: {
            month: { $month: dateFieldName },
            day: { $dayOfMonth: dateFieldName },
            year: { $year: dateFieldName }
        },
        month: {
            month: { $month: dateFieldName },
            year: { $year: dateFieldName }
        },
        year: {
            year: { $year: dateFieldName }
        }

    };
    var dateGroupBy = req.query.dateGroupBy;
    if (dateGroupBy){
        group.date = date_groupings[dateGroupBy];
    }
    return group;
};

module.exports = function(db) {
    var aggregationModels = new models.AggregationModels(db);
    var hourlyAdStatPathParams = ['advertiser','campaign','creativegroup','creative'];
    var hourlyAdStatGroupByFields = ['publisher','site','page','placement'];
    var pipelineBuilder = new HourlyAggregationPipelineVarBuilder(hourlyAdStatPathParams, hourlyAdStatGroupByFields, 'hour');
    return {
        hourlyAdStat: {
            /**
             * Queries HourLyAdStats & groups by advertiser object
             */
            getManyAdvertiser: function (req, res) {

                try {
                    var group = pipelineBuilder.getGroup(req);
                } catch (e) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                }

                try {
                    var match = pipelineBuilder.getMatch(req);
                } catch (e) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                }
                aggregationModels.HourlyAdStat
                    .aggregate([
                        {
                            $match: match
                        },
                        {
                            $group: {
                                _id: group,
                                bids: {$sum: "$num_bids"},
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
        }
    };
};
