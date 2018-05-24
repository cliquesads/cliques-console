/* jshint node: true */ 'use strict';
var config = require('config');
var stripePublishableKey = config.get('Stripe.publishable_key');
var pricing = config.get('Pricing');
var _ = require('lodash');

/**
 * Module dependencies.
 */
module.exports = function(db){
    var getLatestHour = require('./aggregations.server.controller')(db).hourlyAdStat.getLatestHour;
    return {
        index: function(req, res) {
            getLatestHour(function(err, result){
                res.render('index', {
                    user: req.user || null,
                    request: req,
                    latestHour: result ? result.toUTCString() : null,
                    consoleVersion: res._headers['console-version'],
                    stripePublishableKey: stripePublishableKey,
                    pricing: pricing
                });
            });
        }
    };
};