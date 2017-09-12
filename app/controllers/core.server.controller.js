/* jshint node: true */ 'use strict';
var config = require('config');
var stripePublishableKey = config.get('Stripe.publishable_key');
var NATIVE_SPECS = require('@cliques/cliques-node-utils').mongodb.models.NATIVE_SPECS;
var _ = require('lodash');

var nativeSpecs = _.extend(config.get('Native'), NATIVE_SPECS);

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
                    nativeSpecs: nativeSpecs,
                    consoleVersion: res._headers['console-version'],
                    stripePublishableKey: stripePublishableKey
                });
            });
        }
    };
};