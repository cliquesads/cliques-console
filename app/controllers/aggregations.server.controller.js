/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
    mongoose = require('mongoose'),
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash'),
    async = require('async'),
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
        val = val.split(',');
    }
    if (operator){
        operator = operator[1];
        if (this.queryParamOperators.indexOf(operator) > -1){
            operator = '$' + operator;
        } else {
            throw new Error('Unknown operator: ' + operator);
        }
        var obj = {};
        obj[operator] = val;
        return obj;
    } else {
        return val;
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
            match[param] = req.param(param);
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
                match.hour = { $lt: new Date(req.query.endDate) };
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
            });
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
 * @param advertiserModels
 * @param publisherModels
 * @constructor
 */
var HourlyAdStatAPI = function(aggregationModels, advertiserModels, publisherModels){
    this.aggregationModels = aggregationModels;
    this.advertiserModels = advertiserModels;
    this.publisherModels = publisherModels;
    this.adv_params = ['advertiser','campaign','creativegroup','creative'];
    this.pub_params = ['publisher','site','page','placement'];
    this.clique_params = ['pub_clique', 'adv_clique'];
    this.advPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.adv_params, this.pub_params, 'hour');
    this.pubPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.pub_params, this.adv_params, 'hour');
    this.cliquePipelineBuilder = new HourlyAggregationPipelineVarBuilder([], this.clique_params, 'hour');

    //TODO: Don't love this, should figure out better way to handle general queries
    var all_params = this.adv_params.concat(this.pub_params);
    all_params = all_params.concat(this.clique_params);
    this.genPipelineBuilder = new HourlyAggregationPipelineVarBuilder([],all_params, 'hour');
};

/**
 * Method to proper-case a string, used for resolving populate query params to model names
 */
String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

/**
 * Sub-method just to handle field population logic, as populating fields
 * for aggregation pipeline results is not natively supported in Mongo or Mongoose.
 *
 * THIS IS NOT VERY EFFICIENT, WOULD LOVE TO FIGURE OUT BETTER WAY TO HANDLE THIS.
 *
 * ACTUALLY, IT'S HORRIBLY INEFFCIENT AND PROBABLY SHOULDN'T BE USED FOR ANY
 * LARGER DATASETS WHATSOEVER.
 *
 * @param populateQueryString
 * @param query_results
 * @param group
 * @param callback
 * @private
 */
HourlyAdStatAPI.prototype._populate = function(populateQueryString, query_results, group, callback){
    var self = this;
    var populates = populateQueryString.split(',');
    var asyncFieldFuncs = [];
    populates.forEach(function(field){
        asyncFieldFuncs.push(function(callback){
            // throw out populate param if populate not in group
            if (Object.keys(group).indexOf(field) > -1){
                var modelName = field.toProperCase();
                // First determine whether field is in Publisher or Advertiser tree.
                // If neither, skip it.
                if (self.advertiserModels.hasOwnProperty(modelName)){
                    var treeDocument = 'advertiserModels';
                    var parentFieldName =  'advertiser';
                    var parentModelName = 'Advertiser';
                } else if (self.publisherModels.hasOwnProperty(modelName)){
                    treeDocument = 'publisherModels';
                    parentFieldName =  'publisher';
                    parentModelName = 'Publisher';
                } else {
                    return callback('Populate field not recognized: ' + field);
                }
                // sub routine to pass to async.map. Just gets child document given
                // populated top-level node doc
                var populateChildField = function(doc, cb) {
                    self[treeDocument].getChildDocument(
                        doc._id[field],
                        modelName,
                        doc._id[parentFieldName],
                        function (err, child) {
                            if (err) return cb(err);
                            if (populates.indexOf(parentFieldName) == -1){
                                // strip off advertiser object for compactness if it's not required
                                // by the API call
                                doc._id[parentFieldName] = doc._id[parentFieldName]._id;
                            }
                            // replace doc ID with object & callback
                            doc._id[field] = child;
                            return cb(null, doc);
                        }
                    );
                };
                // have to populate top level first before doing anything at child-level
                self[treeDocument][parentModelName].populate(query_results, {
                    path: '_id.' + parentFieldName,
                    model: parentModelName
                }, function (err, result) {
                    if (err) return callback(err);
                    if (modelName === parentModelName) {
                        query_results = result;
                        return callback(null, true);
                    } else {
                        // For non-top-level populates, have to loop over results and populate manually
                        // by finding nested docs in populated top-level docs.
                        async.map(result, populateChildField, function(err, result){
                            if (err) return callback(err);
                            query_results = result;
                            return callback(null, true);
                        });
                    }
                });
            } else {
                return callback('Populate field not in group: ' + field);
            }

        });
    });
    async.series(asyncFieldFuncs, function(err, result){
        if (err) return callback(err);
        return callback(null, query_results);
    })
};

HourlyAdStatAPI.prototype._getManyWrapper = function(pipelineBuilder){
    var self = this;
    return function (req, res) {
        var group;
        try {
            group = pipelineBuilder.getGroup(req);
        } catch (e) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(e)
            });
        }
        var match;
        try {
            match = pipelineBuilder.getMatch(req);
        } catch (e) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(e)
            });
        }
        var query = self.aggregationModels.HourlyAdStat
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
            ]);
        query.exec(function(err, hourlyAdStats){
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                //catch populate query param here and call model populate
                // NOTE: Can only pass populate for object in 'group' object
                // otherwise this will throw out the populate param
                if (req.query.populate){
                    self._populate(req.query.populate, hourlyAdStats, group, function(err, results){
                        if (err) {
                            return res.status(400).send({ message: err });
                        }
                        res.json(results);
                    });
                } else {
                    res.json(hourlyAdStats);
                }
            }
        });
    };
};


// BEGIN actual methods to expose to API routes.
// TODO: Don't know whether it makes sense to maintain two separate sets of
// TODO: API endpoints -- one hierarchical based on path params and the other
// TODO: non-hierarchical.  Need to choose one or the other, gets confusing
// TODO: pretty quickly.

/*------------ General (non-path-param) methods ------------ */

HourlyAdStatAPI.prototype.getMany = function(req, res){
    return this._getManyWrapper(this.genPipelineBuilder)(req, res);
};

/**
 * Basically just wraps getMany call in call to get user's advertisers,
 * then passes list of advertisers to getMany to match against.
 *
 * @param req
 * @param res
 * @returns {*}
 */
HourlyAdStatAPI.prototype.getManyAdvertiserSummary = function(req, res){
    var self = this;
    var filter_query = {};
    if (req.user.roles.indexOf('admin') === -1){
        filter_query.user = req.user.id;
    }
    self.advertiserModels.Advertiser.find(filter_query, function(err, advertisers){
        var ids = [];
        advertisers.forEach(function(doc){
            ids.push(doc._id);
        });

        req.query.advertiser = '{in}' + ids.join(',');
        return self._getManyWrapper(self.genPipelineBuilder)(req, res);
    });
};

/**
 * Basically just wraps getMany call in call to get user's publishers,
 * then passes list of publishers to getMany to match against.
 *
 * @param req
 * @param res
 * @returns {*}
 */
HourlyAdStatAPI.prototype.getManyPublisherSummary = function(req, res){
    var self = this;
    var filter_query = {};
    if (req.user.roles.indexOf('admin') === -1){
        filter_query.user = req.user.id;
    }
    self.publisherModels.Publisher.find(filter_query, function(err, publishers){
        var ids = [];
        publishers.forEach(function(doc){
            ids.push(doc._id);
        });
        req.query.publisher = '{in}' + ids.join(',');
        return self._getManyWrapper(self.genPipelineBuilder)(req, res);
    });
};

/*------------ Hierarchical, path-param methods ------------ */

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
    var advertiserModels = new models.AdvertiserModels(db);
    var publisherModels = new models.PublisherModels(db);
    var hourlyAdStatAPI = new HourlyAdStatAPI(aggregationModels, advertiserModels, publisherModels);
    return {
        hourlyAdStat: {
            getMany: function (req, res) {
                return hourlyAdStatAPI.getMany(req, res);
            },
            getManyAdvertiserSummary: function (req, res) {
                return hourlyAdStatAPI.getManyAdvertiserSummary(req, res);
            },
            getManyPublisherSummary: function (req, res) {
                return hourlyAdStatAPI.getManyPublisherSummary(req, res);
            },
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