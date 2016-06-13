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

var getBillingQuery = function(startDate, endDate, group){
    return aggregationModels.HourlyAdStat
        .aggregate([
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
        ]);
};


/**
 * Step 1
 */
var getAggregatesData = new Promise(function(resolve, reject){
    // run billing in UTC
    var startDate = moment().tz('UTC').subtract(1, 'month').startOf('day').startOf('month').toDate();
    var endDate = moment().tz('UTC').startOf('day').startOf('month').toDate();

    var advQuery = getBillingQuery(startDate, endDate, { advertiser: '$advertiser' });
    var pubQuery = getBillingQuery(startDate, endDate, { publisher: '$publisher' });

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
function populateOrganizations(results) {
    return new Promise(function(resolve, reject){
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

        // call in parallel for both advertiser & publisher data
        async.parallel([
            function(callback){ return _inner(results[0], 'advertiser', callback)},
            function(callback){ return _inner(results[1], 'publisher', callback)}
        ], function(err, populated){
            if (err) return reject(err);
            return resolve(populated);
        });
    });
}


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
            function(populated){ console.log(populated); },
            function(err){ console.error(err); }
        );
});