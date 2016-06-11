/* jshint node: true */ 'use strict';

var init = require('../config/init')(),
    config = require('../config/config'),
    cliques_mongo = require('@cliques/cliques-node-utils').mongodb,
    models = cliques_mongo.models,
    _ = require('lodash'),
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
var user = require('../app/models/billing.server.model');

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
                    advertiserModels.Advertiser.populate(results, { path: '_id.advertiser' },
                        function(err, populated){ return callback(null, populated); });
                }
            });
        },
        function(callback){
            pubQuery.exec(function(err,results){
                if (err){
                    return callback(err);
                } else {
                    publisherModels.Publisher.populate(results, { path: '_id.publisher' },
                        function(err, populated){ return callback(null, populated); });
                }
            });
        }
    ], function(err, results){
        if (err) reject(err);
        else resolve(results);
    });
});

getAggregatesData.then(
    function(results){
        var advResults = results[0];
        var pubResults = results[1];
        
    },
    function(err){
        console.error(err);
    }
);