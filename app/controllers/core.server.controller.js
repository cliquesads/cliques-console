/* jshint node: true */ 'use strict';
const config = require('config');
const stripePublishableKey = config.get('Stripe.publishable_key');
const _ = require('lodash');

/**
 * Module dependencies.
 */
module.exports = db => {
    const getLatestHour = require('./aggregations.server.controller')(db).hourlyAdStat.getLatestHour;
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