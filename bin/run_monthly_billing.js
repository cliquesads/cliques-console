/* jshint node: true */ 'use strict';

var init = require('../config/init')(),
    config = require('../config/config'),
    cliques_mongo = require('@cliques/cliques-node-utils').mongodb,
    models = cliques_mongo.models,
    _ = require('lodash'),
    mongoose = require('mongoose'),
    async = require('async'),
    chalk = require('chalk'),
    Promise = require('promise'),
    util = require('util'),
    autoIncrement = require('mongoose-auto-increment'),
    moment = require('moment-timezone');

// Build the connection string
var exchangeMongoURI = util.format('mongodb://%s:%s/%s',
    config.mongodb.host,
    config.mongodb.port,
    config.mongodb.db);

var exchangeMongoOptions = {
    user: config.mongodb.user,
    pass: config.mongodb.pwd,
    auth: {authenticationDatabase: config.mongodb.db}
};

var db = cliques_mongo.createConnectionWrapper(exchangeMongoURI, exchangeMongoOptions, function(err, logstring){
    if (err) {
        console.error(chalk.red('Could not connect to MongoDB!'));
        console.log(chalk.red(err));
    }
    console.log(logstring);
});

autoIncrement.initialize(db);

// Initialize models
var aggregationModels = new models.AggregationModels(db);
var advertiserModels = new models.AdvertiserModels(db);
var publisherModels = new models.PublisherModels(db);
var billing = require('../app/models/billing.server.model');
var user = require('../app/models/user.server.model');


/**
 * Returns query object used for billing.  Must specify start & end dates, group & match are optional.
 *
 * @param startDate
 * @param endDate
 * @param group
 * @param match
 * @returns {Aggregate|Promise}
 */
var getBillingQuery = function(startDate, endDate, group, match){
    var pipeline = [
        { $match: {
            hour: {
                $gte: startDate,
                $lt: endDate
            }
        }},
        { $group: {
            _id: group,
            bids: {$sum: "$bids"},
            imps: {$sum: "$imps"},
            defaults: {$sum: "$defaults"},
            spend: {$sum: "$spend"},
            clicks: {$sum: "$clicks"},
            view_convs: {$sum: "$view_convs"},
            click_convs: {$sum: "$click_convs"}
        }}
    ];

    if (match){
        pipeline[0]["$match"] = _.merge(pipeline[0]["$match"], match);
    }

    return aggregationModels.HourlyAdStat.aggregate(pipeline);
};

// run billing in UTC
var START_DATE = moment().tz('UTC').subtract(1, 'month').startOf('day').startOf('month').toDate();
var END_DATE = moment().tz('UTC').startOf('day').startOf('month').toDate();

/**
 * Step 1
 */
var getAggregatesData = new Promise(function(resolve, reject){

    var advQuery = getBillingQuery(START_DATE, END_DATE, { advertiser: '$advertiser' });
    var pubQuery = getBillingQuery(START_DATE, END_DATE, { publisher: '$publisher' });

    async.parallel([
        function(callback){
            advQuery.exec(function(err,results){
                if (err){
                    return callback(err);
                } else {
                    advertiserModels.Advertiser.populate(
                        results,
                        { path: '_id.advertiser', populate: 'organization' },
                        function(err, populated){
                            if (err) return callback(err);
                            return callback(err, populated);
                        }
                    );
                }
            });
        },
        function(callback){
            pubQuery.exec(function(err,results){
                if (err){
                    return callback(err);
                } else {
                    publisherModels.Publisher.populate(
                        results,
                        { path: '_id.publisher' },
                        function(err, populated){
                            if (err) return callback(err);
                            return callback(err, populated);
                        }
                    )
                }
            });
        }
    ], function(err, results){
        if (err) reject(err);
        else resolve(results);
    });
});


/**
 * Step 2
 *
 * Doesn't actually populate, just gets organization data for each row efficiently and
 * stores in top-level row object
 *
 * @param results
 */
var populateOrganizations = function(results) {
    // inner function does actual query for one resultset
    function _inner(results, model, callback){
        var orgs = [];
        results.forEach(function(row){
            if (row._id[model]){
                orgs.push(row._id[model].organization);
            }
        });
        user.Organization.find({ _id: { $in: orgs}}, function(err, organizations){
            if (err) return callback(err);
            organizations.forEach(function(org) {
                var row = _.find(results, function(r){
                    if (r._id[model]){
                        return r._id[model].organization.toString() === org._id.toString();
                    }
                });
                if (row){
                    row.organization = org;
                }
            });
            return callback(null, results);
        });
    }
    return new Promise(function(resolve, reject){
        // call in parallel for both advertiser & publisher data
        async.parallel([
            function(callback){ return _inner(results[0], 'advertiser', callback)},
            function(callback){ return _inner(results[1], 'publisher', callback)}
        ], function(err, populated){
            if (err) return reject(err);
            return resolve(populated);
        });
    });
};

/**
 * Gets insertionOrders, if any, for this time period.
 *
 * Then, groups both advertiser & publisher query results by
 * Organization (in case there are multiple advertisers/publishers
 * for a given org).
 *
 * Finally, if there are any IO's for a given organization, re-queries HourlyAdStat
 * to get partitioned dataset for billing purposes.
 *
 * @param orgPopulatedQueryResults
 */
var groupByOrgAndInsertionOrder = function(orgPopulatedQueryResults){
    var initialAdvertiserResults = _.groupBy(orgPopulatedQueryResults[0], 'organization._id');
    var initialPublisherResults = _.groupBy(orgPopulatedQueryResults[1], 'organization._id');
    var advertiserResults = {};


    // inner promise for InsertionOrders query
    var getInsertionOrders = new Promise(function(resolve, reject) {
        // find insertion orders with dates in this time period
        billing.InsertionOrder.find({
            end_date: {$gte: START_DATE},
            start_date: {$lte: END_DATE}
        }).exec(function (err, insertionOrders) {
            if (err) return reject(err);
            resolve(insertionOrders);
        });
    });

    var getInsertionOrderData = function(insertionOrders){
        return new Promise(function(resolve, reject){
            // NOTE: Assumes only advertiser results need this IO partitioning.
            // Don't have a use case for publishers needing this currently, nor do I
            // see one in the immediate future.
            // ALSO assumes that there's only one insertionorder per organization/dateRange.
            // This is validated in pre-save method on InsertionOrder schema
            async.forEachOf(initialAdvertiserResults, function(results, org, callback){
                var insertionOrder = _.find(insertionOrders, function(io){
                    return io.organization.toString() === org.toString()
                });
                if (insertionOrder && insertionOrder.length > 0){
                    // see note above about insertionOrder uniqueness per org/dateRange
                    insertionOrder = insertionOrder[0];
                    // Do date range manipulation to get distinct query results for dates within IO & dates
                    // outside IO.
                    var insertionOrderRange = moment.range(insertionOrder.start_date, insertionOrder.end_date);
                    var paymentRange = moment.range(START_DATE, END_DATE);
                    // range for which payment will reflect IO terms
                    var intersect = paymentRange.intersect(insertionOrderRange);
                    // range (or ranges, if intersect is a subset of payment range)
                    // for which payment will reflect default terms
                    var complement = paymentRange.subtract(paymentRange);
                    // get results & advertisers to re-query
                    var thisOrgResults = advertiserResults[org];
                    var advertisers = thisOrgResults.map(function(result){ return result._id.advertiser; });
                    // get match query arg
                    var advertisersMatch = { advertiser: { $in: advertisers }};
                    var advertisersGroup = { advertiser: '$advertiser' };
                    // create query for insertionOrder timeperiod
                    var insertionOrderQueryFunc = function(callback){
                        var query = getBillingQuery(intersect.start, intersect.end,
                            advertisersMatch, advertisersGroup);
                        query.exec(function(err, results){
                            if (err) return callback(err);
                            return callback(null,results);
                        });
                    };
                    // may be multiple ranges in complement if IO range is subset of payments range
                    if (complement.length > 0){
                        var complementQueryFuncs = complement.map(function(range){
                            return function(callback){
                                var query = getBillingQuery(range.start, range.end,
                                    advertisersMatch, advertisersGroup);
                                query.exec(function(err, results){
                                    if (err) return callback(err);
                                    return callback(null,results);
                                });
                            }
                        });
                    }
                    // put insertionOrderQuery first
                    complementQueryFuncs.unshift(insertionOrderQueryFunc);
                    // finally, execute queries in parallel
                    async.parallel(complementQueryFuncs,function(err, allResults){
                        if (err) return callback(err);
                        // add insertionOrder to first results
                        allResults[0].forEach(function(row){ row.insertionOrder = insertionOrder; });
                        advertiserResults[org] = _.flatten(allResults);
                        return callback();
                    });
                } else {
                    // if no insertionOrder is found, just pass straight through to final results
                    advertiserResults[org] = results;
                    return callback();
                }
            }, function(err){
                if (err) return reject(err);
                return resolve(advertiserResults);
            });
        });
    };

    // wrapper promise that executes both insertionOrder & insertionOrderData steps
    return new Promise(function(resolve, reject) {
        getInsertionOrders
            .then(getInsertionOrderData, function (err) {
                return reject(err);
            })
            .then(function(advertiserResults){
                return resolve([advertiserResults, initialPublisherResults]);
            }, function(err){ return reject(err); });
    });
};

var createPayments = function(populatedResults){
    function _inner(results, model, callback){
        results.forEach(function(row){
            if (row._id[model]){

                // ######## CREATE NEW PAYMENT ###########

                var payment = new billing.Payment({
                    start_date: START_DATE,
                    end_date: END_DATE,
                    organization: row.organization._id,
                    paymentType: model,
                    imps: row.imps,
                    spend: row.spend,
                    clicks: row.clicks,
                    view_convs: row.view_convs,
                    click_convs: row.click_convs,
                    billingMethod: row.organization.billingPreference,
                    status: "Pending"
                });

                // ######### BEGIN FEE LOGIC #############

                var fees = row.organization.fees.filter(function(fee){
                    return fee.type === model;
                });
                // TODO: Need to add validation to Organization to prevent multiple
                // TODO: fees of same type
                if (fees.length > 1){
                    return callback("ERROR: Multiple fees of type: " + model + " found for" +
                        " organization " + row.organization.name);
                } else {
                    payment.fee = fees[0];
                }

                // ########## BEGIN INSERTION ORDER LOGIC ##########

                // ########## BEGIN CONTRACT TYPE LOGIC ###########


                // ########## CALCULATE TOTALS ############

            }

        });

    }

    return new Promise(function(resolve, reject){

        // call in parallel for both advertiser & publisher data
        async.parallel([
            function(callback){ return _inner(results[0], 'advertiser', callback)},
            function(callback){ return _inner(results[1], 'publisher', callback)}
        ], function(err, populated){
            if (err) return reject(err);
            return resolve(populated);
        });
    });
};


mongoose.connect(exchangeMongoURI, exchangeMongoOptions, function(err, logstring) {
    if (err) {
        console.error(chalk.red('Could not connect default connection to MongoDB!'));
        console.log(chalk.red(err));
    }
    console.log('Connected to exchange connection as default mongo DB connection');

    // Kick off the promise chain
    getAggregatesData
        .then(
            function (results) { return populateOrganizations(results); },
            function (err) { console.error(err); }
        )
        .then(
            function(populated){ groupByOrgAndInsertionOrder(populated); },
            function(err){ console.error(err); }
        )
        .then(
            function(populated){ createPayments(populated); },
            function(err){ console.error(err);}
        );
});