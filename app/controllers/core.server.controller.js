/* jshint node: true */ 'use strict';
var config = require('config');
var stripePublishableKey = config.get('Stripe.publishable_key');
var _ = require('lodash');

/**
 * Module dependencies.
 */
module.exports = db => {
    var getLatestHour = require('./aggregations.server.controller')(db).hourlyAdStat.getLatestHour;
    return {
        index: function(req, res) {
            getLatestHour((err, result) => {
                res.render('index', {
                    user: req.user || null,
                    request: req,
                    latestHour: result ? result.toUTCString() : null,
                    consoleVersion: res._headers['console-version'],
                    stripePublishableKey: stripePublishableKey
                });
            });
        }
    };
};