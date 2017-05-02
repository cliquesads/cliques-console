/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('@cliques/cliques-node-utils').mongodb.models,
    mongoose = require('mongoose'),
    errorHandler = require('../../errors.server.controller'),
    _ = require('lodash'),
    async = require('async'),
    moment = require('moment-timezone');


/**
 * Constructor for PipelineVarsBuilder object, which translates API request
 * path params into MongoDB Aggregation Pipeline-compatible objects.
 *
 * Use `pathParams` to provide array of expected path parameters. Any path params
 * found will be use in `group` and `match`, so query results will be filtered
 * to match desired param value, and will be grouped by corresponding field.
 *
 * Use `queryParams` to pass in non-hierarchical dimensions by which you wish
 * to filter query results.  Resulting data will not be grouped by these dimensions
 * unless specified using the `groupBy` query parameter.
 *
 * **NOTE**: When grouped by date unit, converts all dates to user's timezone before returning
 * so no conversion is necessary on client side
 *
 * Additionally, you can pass in comma-separated values for any queryParam, and you
 * get access to the following operators which are passed directly to $match step
 * in the MongoDB Aggregation Pipeline
 *
 * * `{in}` element in array
 * * `{nin}` element not in array
 * * `{ne}` matches any row with field val not equal to query val
 *
 * ## SPECIAL QUERY PARAMS:
 * * `startDate`: (inclusive) accepts ISO formatted datetimes, assumed to be UTC (e.g. '1995-12-17T03:24:00')
 * * `endDate`: (exclusive) accepts ISO formatted datetimes, assumed to be UTC (e.g. '1995-12-17T03:24:00')
 * * `groupBy`: single value or CSV containing additional fields to group by. NOTE: DO NOT INCLUDE DATE FIELD, use
 *          dateGroupBy param instead
 * * `dateGroupBy`: 'hour', 'day', 'month' or 'year'
 *
 * @param {Array} pathParams Array of parameters to be parsed as URL path parameters
 * @param {Array} queryParams Array of parameters to be parsed as query parameters
 * @param {String} dateFieldName name of date field in aggregation model, default is 'hour'
 * @constructor
 */
var HourlyAggregationPipelineVarBuilder = exports.HourlyAggregationPipelineVarBuilder = function(pathParams, queryParams, dateFieldName){
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
 * with Mongo-compatible operator (i.e. prefixed with `$`) as key.
 *
 * Also parses special values:
 *      - 'null' --> null
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
    } else if (val === 'null') {
        //TODO: this won't catch 'null' in an array, but I don't really think you need to
        val = null;
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
            groupBy = groupBy.split(',');
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
 * Object to subclass per aggregation model to provide getMany wrappers that
 * handle aggregation API requests.
 *
 * @param aggregationModels
 * @param advertiserModels
 * @param publisherModels
 * @constructor
 */
var AdStatsAPIHandler = exports.AdStatsAPIHandler = function(db){
    this.aggregationModels = new models.AggregationModels(db);
    this.advertiserModels = new models.AdvertiserModels(db);
    this.publisherModels = new models.PublisherModels(db);
    this.geoModels = new models.GeoModels(db);
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
AdStatsAPIHandler.prototype._populate = function(populateQueryString, query_results, group, callback){
    // I'm not proud of this, there should be an easier way to do this.
    //
    // Basically this loops through the fields passed in by req.param.populate
    // and determines which tree (Advertiser or Publisher) those fields belong to.
    //
    // Then, for each field, it calls the Model form of 'populate' to populate the
    // top-level node of that tree (which, based on how populate/Mongo works, is the
    // only field that represents an ID belonging to a collection rather than a sub-doc,
    // and is thus the only field that CAN be populated).
    //
    // Finally, once the query result is populated with the top-level doc from the respective
    // tree, it maps the appropriate child doc to the populate field in each query result row.
    // So net-net, calls the DB once per populate field provided (I think).
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
                var treeDocument;
                var parentFieldName;
                var parentModelName;
                if (self.advertiserModels.hasOwnProperty(modelName)){
                    treeDocument = 'advertiserModels';
                    parentFieldName =  'advertiser';
                    parentModelName = 'Advertiser';
                } else if (self.publisherModels.hasOwnProperty(modelName)){
                    treeDocument = 'publisherModels';
                    parentFieldName =  'publisher';
                    parentModelName = 'Publisher';
                } else if (self.geoModels.hasOwnProperty(modelName)){
                    // geoModels models are not tree documents, so populateChildField
                    // can always be bypassed. Set modelName to parentModelName to
                    // ensure only goes as deep as model populate call
                    treeDocument = 'geoModels';
                    parentModelName = modelName;
                    parentFieldName = field;
                } else {
                    return callback('Populate field not recognized: ' + field);
                }

                // sub routine to pass to async.map. Just gets child document given
                // populated top-level node doc
                var populateChildField = function(doc, callback) {
                    if (doc._id[field] && doc._id[parentFieldName]){
                        self[treeDocument].getChildDocument(
                            doc._id[field],
                            modelName,
                            doc._id[parentFieldName],
                            function (err, child) {
                                if (err) {
                                    if (err instanceof ReferenceError){
                                        // this means the object was deleted, just don't populate anything
                                        child = null;
                                    } else {
                                        return callback(err);
                                    }
                                }
                                if (populates.indexOf(parentFieldName) === -1){
                                    // strip off advertiser object for compactness if it's not required
                                    // by the API call
                                    doc._id[parentFieldName] = doc._id[parentFieldName]._id;
                                }
                                // replace doc ID with object & callback
                                doc._id[field] = child;
                                return callback(null, doc);
                            }
                        );
                    } else {
                        doc._id[field] = null;
                        return callback(null, doc);
                    }
                };

                // TODO: Don't have to populate here if top-level node has already
                // TODO: been populated, can save a trip to the database
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
    });
};

/**
 * Factory for getMany controller functions. Takes the legwork out of binding all of the query execution
 * pieces (parsing `group` & `match` pipeline objects, executing aggregation query & populating results).
 */
AdStatsAPIHandler.prototype._getManyWrapper = function(pipelineBuilder, aggregationModel){
    var self = this;
    return function (req, res) {
        var group;
        try {
            group = pipelineBuilder.getGroup(req);
        } catch (e) {
            console.log("error in group: " + e);
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(e)
            });
        }
        var match;
        try {
            match = pipelineBuilder.getMatch(req);
        } catch (e) {
            console.log("error in match: " + e);
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(e)
            });
        }
        // toggle demo or non-demo aggregation model, depending on
        // request query param sent in
        // var model = req.query.demo === 'true' ? self.aggregationModels.DemoHourlyAdStat : self.aggregationModels.HourlyAdStat;
        var query = aggregationModel
            .aggregate([
                { $match: match },
                //{ $sort: { hour: -1 }}, //I thought this sorts descending but apparently doesn't??
                {
                    $group: {
                        _id: group,
                        bids: {$sum: "$bids"},
                        imps: {$sum: "$imps"},
                        defaults: {$sum: "$defaults"},
                        spend: {$sum: "$spend"},
                        clicks: {$sum: "$clicks"},
                        view_convs: {$sum: "$view_convs"},
                        click_convs: {$sum: "$click_convs"}
                    }
                }
            ]);
        query.exec(function(err, adStats){
            if (err) {
                console.log("error in query: " + err);
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                //catch populate query param here and call model populate
                // NOTE: Can only pass populate for object in 'group' object
                // otherwise this will throw out the populate param
                if (req.query.populate){
                    self._populate(req.query.populate, adStats, group, function(err, results){
                        if (err) {
                            return res.status(400).send({ message: err });
                        }
                        res.json(results);
                    });
                } else {
                    res.json(adStats);
                }
            }
        });
    };
};