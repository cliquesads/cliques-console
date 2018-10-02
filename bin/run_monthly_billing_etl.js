/* jshint node: true */ 'use strict';

require('./_main')(function(GLOBALS){
    var models = GLOBALS.cliques_mongo.models,
        mongoose = GLOBALS.mongoose,
        db = GLOBALS.db,
        _ = require('lodash'),
        chalk = require('chalk'),
        async = require('async'),
        Promise = require('promise'),
        util = require('util'),
        mail = require('../app/controllers/mailer.server.controller'),
        moment = require('moment-timezone');

    require('moment-range');

    var mailer = new mail.Mailer({ templatePath: __dirname + '/../app/views/templates' });

    // Initialize all models needed
    var aggregationModels = new models.AggregationModels(db);
    var advertiserModels = new models.AdvertiserModels(db);
    var publisherModels = new models.PublisherModels(db);
    var user = require('../app/models/user.server.model');
    var billing = require('../app/models/billing.server.model');
    var Organization = require('../app/models/organization.server.model').Organization;
    var Payment = mongoose.model('Payment');
    var InsertionOrder = mongoose.model('InsertionOrder');

    var monthsAgo = 1;
    // Get start & dates for which to run billing process: LAST MONTH, UTC.
    var START_DATE = moment().tz('UTC').subtract(monthsAgo, 'month').startOf('day').startOf('month').toDate();
    // get end of day at end of month, since query will include end date
    var END_DATE = moment().tz('UTC').subtract(monthsAgo, 'month').endOf('day').endOf('month').toDate();

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
     * This is unnecessary if you can figure out a way to do a two-level-deep populate for
     * Organization, since HourlyAdStats row only stores Advertiser or Publisher ref.  But
     * I got sick of trying to figure that out, and this was easy enough to do.
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
            Organization.find({ _id: { $in: orgs}}, function(err, organizations){
                if (err) return callback(err);
                organizations.forEach(function(org) {
                    var rows = results.filter(function(r){
                        if (r._id[model]){
                            return r._id[model].organization.toString() === org._id.toString();
                        }
                    });
                    if (rows.length > 0){
                        rows.forEach(function(row){
                            row.organization = org;
                        });
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
        // get rid of aggregates without organizations.  These are defaults/bids w/ no imps
        delete initialAdvertiserResults["undefined"];
        delete initialPublisherResults["undefined"];
        var advertiserResults = {};

        // sub-promise to get InsertionOrders
        var getInsertionOrders = new Promise(function(resolve, reject) {
            // find insertion orders with dates in this time period
            InsertionOrder.find({
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
                        // since results will be replaced, get Organization document
                        // populated before on existing results to tag onto new results
                        var organization = results[0].organization;
                        // get partitioned and IO-flagged date ranges for query
                        var ranges = partitionDateRange(insertionOrders);
                        // get results & advertisers to re-query
                        var thisOrgResults = initialAdvertiserResults[org];
                        var advertisers = thisOrgResults.map(function(result){
                            return result._id.advertiser._id.toString();
                        });
                        // get match query arg
                        var advertisersMatch = { advertiser: { $in: advertisers }};
                        var advertisersGroup = { advertiser: '$advertiser' };
                        // create query for insertionOrder timeperiod
                        var queryFuncs = ranges.map(function(range){
                            return function(callback){
                                var query = getBillingQuery(range.start.toDate(), range.end.toDate(),
                                    advertisersGroup, advertisersMatch);
                                query.exec(function(err, results){
                                    if (err) return callback(err);
                                    // re-populate Advertiser model
                                    advertiserModels.Advertiser.populate(
                                        results,
                                        { path: '_id.advertiser' },
                                        function(err, populated){
                                            if (err) return callback(err);
                                            populated.forEach(function(elem, index, arr){
                                                // check if this is an insertionOrder range or not, if so add IO
                                                // to all results in this range
                                                if (range.insertionOrder){
                                                    arr[index].insertionOrder = range.insertionOrder;
                                                }
                                                arr[index].organization = organization;
                                            });
                                            return callback(null,populated);
                                        }
                                    );
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
     * @param orgGroupedResults
     */
    var createPayments = function(orgGroupedResults){
        /**
         * Creates a single payment object, using org-grouped HourlyAdStats query results
         *
         * wrapper function just captures model in closure (i.e. 'advertiser' or 'publisher')
         */
        var _createSinglePayment = function(model){
            var isAdvertiser = (model === "advertiser");
            return function(results, org, callback) {
                if (org) {
                    var organization = results[0].organization;
                    // ######## CREATE NEW PAYMENT ###########
                    var payment = new Payment({
                        start_date: START_DATE,
                        end_date: END_DATE,
                        organization: organization._id,
                        paymentType: model,
                        billingMethod: organization.billingPreference,
                        status: "Needs Approval",
                        lineItems: []
                    });

                    // ######### BEGIN FEE LOGIC #############
                    if (organization.fees){
                        var fees = organization.fees.filter(function (fee) {
                            return fee.type === model;
                        });
                        // TODO: Need to add validation to Organization to prevent multiple
                        // TODO: fees of same type
                        if (fees.length > 1) {
                            return callback("ERROR: Multiple fees of type: " + model + " found for" +
                                " organization " + organization.name);
                        } else {
                            payment.fee = fees[0];
                        }
                    }

                    // ########## BEGIN LINEITEM CALCS ##########
                    // There will be a separate lineitem for each (insertionOrder,model) combo
                    results.forEach(function (row) {
                        var lineItem = {
                            imps: row.imps,
                            clicks: row.clicks,
                            view_convs: row.view_convs,
                            click_convs: row.click_convs,
                            spend: row.spend,
                            lineItemType: isAdvertiser ? "AdSpend" : "Revenue",
                            insertionOrder: row.insertionOrder || null, // will be undefined if no insertionOrder present
                            contractType: row.insertionOrder ? row.insertionOrder.contractType : "cpm_variable"
                        };
                        // calculate lineitem amount & rate
                        lineItem = Payment.lineItem_getSpendRelatedAmountAndRate(lineItem, row.insertionOrder);
                        lineItem = Payment.lineItem_generateDescription(lineItem, row._id[model]);
                        payment.lineItems.push(lineItem);
                    });

                    // ########## CREATE FEE LINEITEMS ########### //
                    payment.calculateFeeOrRevShareLineItem();

                    // ########## SAVE NEW PAYMENT & ADD TO ORGANIZATION ###### //
                    payment.save(function (err, p) {
                        if (err) return callback(err);
                        // even though there's a post-init hook
                        p.addToOrganization(function(err){
                            if (err) return callback(err);
                            return callback();
                        });
                    });
                } else {
                    return callback();
                }
            }
        };

        return new Promise(function(resolve, reject){
            // call in parallel for both advertiser & publisher data
            async.parallel([
                function(callback){
                    var createSinglePayment = _createSinglePayment('advertiser');
                    async.forEachOf(orgGroupedResults[0], createSinglePayment, function(err){
                        if (err) return callback(err);
                        callback();
                    });
                },
                // function(callback){
                //     var createSinglePayment = _createSinglePayment('publisher');
                //     async.forEachOf(orgGroupedResults[1], createSinglePayment, function(err){
                //         if (err) return callback(err);
                //         callback();
                //     });
                // }
            ], function(err){
                if (err) return reject(err);
                return resolve();
            });
        });
    };

    // ###############################
    // ########### RUN ETL ###########
    // ###############################
    // Kick off the promise chain
    getAggregatesData
        .then(
            function (results) { return populateOrganizations(results); },
            function (err) { console.error(chalk.red(err.stack)); }
        )
        .then(
            function(populated){ return groupByOrgAndInsertionOrder(populated); },
            function(err){ console.error(chalk.red(err.stack)); }
        )
        .then(

            function(orgGroupedResults){
                // console.log(orgGroupedResults);
                return createPayments(orgGroupedResults);
            },
            function(err){ console.error(chalk.red(err.stack));}
        )
        .then(
            function(){
                console.log('Done!');
                var d = moment(START_DATE).tz("UTC");
                mailer.sendMail({
                    subject: 'Monthly Billing ETL Complete - ' + d.format("MMMM YYYY"),
                    templateName: 'billing-complete-email.server.view.html',
                    data: {month: d.format("MMMM YYYY")},
                    to: 'bliang@cliquesads.com'
                }, function(err, success){
                    if (err) {
                        console.error(chalk.red(err));
                        return process.exit(1);
                    }
                    return process.exit(0);
                });
            },
            function(err){
                console.error(chalk.red(err.stack));
                process.exit(1);
            }
        );
});