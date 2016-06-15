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

require('moment-range');

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

// Initialize all models needed
var aggregationModels = new models.AggregationModels(db);
var advertiserModels = new models.AdvertiserModels(db);
var publisherModels = new models.PublisherModels(db);
var billing = require('../app/models/billing.server.model');
var user = require('../app/models/user.server.model');

// Get start & dates for which to run billing process: LAST MONTH, UTC.
var START_DATE = moment().tz('UTC').subtract(1, 'month').startOf('day').startOf('month').toDate();
// get end of day at end of month, since query will include end date
var END_DATE = moment().tz('UTC').subtract(1, 'month').endOf('day').endOf('month').toDate();

// ######################################################## //
// ############## BEGIN Helper Functions ################## //
// ######################################################## //

/**
 * Effectively transposes insertionOrder date range(s) onto payment period date range,
 * and divides whole period up into more granular ranges, annotating ranges pertaining
 * to a particular insertionOrder with that insertionOrder object
 *
 * Ex:
 * var START_DATE = new Date("2016-05-01T00:00:00Z");
 * var END_DATE = new Date("2016-05-31T23:59:59Z");
 *
 * var IO_1 = {
 *      start_date: new Date("2016-05-03T00:00:00Z"),
 *      end_date: new Date("2016-05-07T23:59:59Z")
 * };
 * var IO_2 = {
 *      start_date: new Date("2016-05-12T00:00:00Z"),
 *      end_date: new Date("2016-05-15T23:59:59Z")
 * };
 *
 * var ranges = partitionDateRange([IO_1, IO_2]);
 * console.log(ranges);
 *
 * > [
 * >   moment.range(new Date("2016-05-01T00:00:00Z"), new Date("2016-05-02T23:59:59Z")),
 *     // this range will have insertionOrder = IO_1;
 * >   moment.range(new Date("2016-05-03T00:00:00Z"), new Date("2016-05-07T23:59:59Z")),
 * >   moment.range(new Date("2016-05-08T00:00:00Z"), new Date("2016-05-11T23:59:59Z")),
 *     // this range will have insertionOrder = IO_2;
 * >   moment.range(new Date("2016-05-12T00:00:00Z"), new Date("2016-05-15T23:59:59Z")),
 * >   moment.range(new Date("2016-05-16T00:00:00Z"), new Date("2016-05-31T23:59:59Z"))
 * > ]
 * @param insertionOrders result of query against InsertionOrder collection
 * @returns {Array.<*>}
 * @private
 */
var partitionDateRange = function(insertionOrders){
    // Do date range manipulation to get distinct query results for dates within IOs & dates
    // outside IO.
    var insertionOrderDateRanges = [];
    // initialize finalRanges with base payment range
    var nonIoRanges = [moment.range(START_DATE, END_DATE)];
    insertionOrders.forEach(function(insertionOrder){
        var ioRange = moment.range(insertionOrder.start_date, insertionOrder.end_date);
        nonIoRanges.forEach(function(range,ind,arr){
            if (range.overlaps(ioRange)){
                // get intersect, this will be the insertionOrder range
                var intersect = range.intersect(ioRange);
                // HACK: add insertionOrder as own property to range
                // so it can be identified later
                intersect.insertionOrder = insertionOrder;
                insertionOrderDateRanges.push(intersect);
                // range (or ranges, if intersect is a subset of payment range)
                // for which payment will reflect default terms
                arr[ind] = range.subtract(intersect);
            }
        });
        // flatten finalRanges so that new complement range partitions can be checked
        // against other IO's
        nonIoRanges = _.flatten(nonIoRanges);
    });
    return nonIoRanges.concat(insertionOrderDateRanges);
};

/**
 * Returns query object used for billing.  Must specify start & end dates, group &
 * match are optional.
 *
 * NOTE: Treats dates as a CLOSED date range to make the treatment of IO ranges simpler.
 * It's easier from a user perspective to think of & treat IO date ranges as closed,
 * and so querying assuming open ranges will cause all IO range-based queries to miss
 * an hour.
 *
 * @param startDate query INCLUDES startDate
 * @param endDate query INCLUDES endDate
 * @param group optional group object
 * @param match optional additional match object
 * @returns {Aggregate|Promise}
 */
var getBillingQuery = function(startDate, endDate, group, match){
    var pipeline = [
        { $match: {
            hour: {
                $gte: startDate,
                $lte: endDate
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


// ######################################################## //
// ############## BEGIN Billing ETL Steps ################# //
// ######################################################## //

/**
 * Step 1
 *
 * Gets hourlyAdStats data grouped by Advertisers & Publishers, passes this along in a promise
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
                        { path: '_id.advertiser' },
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
            function(callback){ return _inner(results[0], 'advertiser', callback) },
            function(callback){ return _inner(results[1], 'publisher', callback) }
        ], function(err, populated){
            if (err) return reject(err);
            return resolve(populated);
        });
    });
};

/**
 * Step 3
 *
 * Gets insertionOrders, if any, for this time period.
 *
 * Then, groups both advertiser & publisher query results by
 * Organization (in case there are multiple advertisers/publishers
 * for a given org).
 *
 * Finally, if there are any IO's for a given organization, re-queries HourlyAdStat
 * to get partitioned dataset for billing purposes.
 *
 * Broken up into a couple of sub-Promises just to avoid callback hell
 *
 * @param orgPopulatedQueryResults
 */
var groupByOrgAndInsertionOrder = function(orgPopulatedQueryResults){
    var initialAdvertiserResults = _.groupBy(orgPopulatedQueryResults[0], 'organization._id');
    var initialPublisherResults = _.groupBy(orgPopulatedQueryResults[1], 'organization._id');
    var advertiserResults = {};

    // sub-promise to get InsertionOrders
    var getInsertionOrders = new Promise(function(resolve, reject) {
        // find insertion orders with dates in this time period
        billing.InsertionOrder.find({
            end_date: {$gte: START_DATE},
            start_date: {$lte: END_DATE}
        }).exec(function (err, allInsertionOrders) {
            if (err) return reject(err);
            return resolve(allInsertionOrders);
        });
    });

    // Loops over all advertiser results.
    // If insertionOrder for advertiser's organization is found for matching time period,
    // re-query HourlyAdStats to get results partitioned by specific sub-date range
    // in order to know how many impressions/units/whatever were served against
    // insertionOrder vs. served outside scope of insertion order
    var getGroupedAndPartitionedAdvertiserResults = function(allInsertionOrders){
        return new Promise(function(resolve, reject){
            // NOTE: Assumes only advertiser results need this IO partitioning.
            // Don't have a use case for publishers needing this currently, nor do I
            // see one in the immediate future.
            // ALSO assumes that there's only one insertionorder per organization/dateRange.
            // This is validated in pre-save method on InsertionOrder schema
            async.forEachOf(initialAdvertiserResults, function(results, org, callback){
                var insertionOrders = allInsertionOrders.filter(function(io){
                    return io.organization.toString() === org.toString();
                });
                if (insertionOrders && insertionOrders.length > 0){
                    // get partitioned and IO-flagged date ranges for query
                    var ranges = partitionDateRange(insertionOrders);
                    // get results & advertisers to re-query
                    var thisOrgResults = initialAdvertiserResults[org];
                    var advertisers = thisOrgResults.map(function(result){ return result._id.advertiser._id.toString(); });
                    // get match query arg
                    var advertisersMatch = { advertiser: { $in: advertisers }};
                    var advertisersGroup = { advertiser: '$advertiser' };
                    // create query for insertionOrder timeperiod
                    var queryFuncs = ranges.map(function(range){
                        return function(callback){
                            var query = getBillingQuery(range.start.toDate(), range.end.toDate(), advertisersGroup, advertisersMatch);
                            query.exec(function(err, results){
                                if (err) return callback(err);
                                // check if this is an insertionOrder range or not, if so add IO
                                // to all results in this range
                                if (range.insertionOrder){
                                    results.forEach(function(elem, index, arr){
                                        arr[index].insertionOrder = range.insertionOrder;
                                    });
                                }
                                return callback(null,results);
                            });
                        };
                    });
                    // finally, execute queries in parallel
                    async.parallel(queryFuncs,function(err, allResults){
                        if (err) return callback(err);
                        // add insertionOrder to first results
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

    return new Promise(function(resolve, reject){
        getInsertionOrders
            .then(
                function(allInsertionOrders){
                    return getGroupedAndPartitionedAdvertiserResults(allInsertionOrders);
                },
                function(err){
                    return reject(err);
                }
            )
            .then(
                function(advertiserResults){
                    return resolve([advertiserResults, initialPublisherResults]);
                },
                function(err){
                    return reject(err);
                }
            )
    });
};

/**
 * Step 4.
 *
 * Create payments objects.
 *
 * @param populatedResults
 */
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
            function(populated){ return groupByOrgAndInsertionOrder(populated); },
            function(err){ console.error(err); }
        )
        .then(
            function(populated){ createPayments(populated); },
            function(err){ console.error(err);}
        );
});