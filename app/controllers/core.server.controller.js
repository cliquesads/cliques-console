/* jshint node: true */ 'use strict';



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
                    latestHour: result.toUTCString(),
                    consoleVersion: res._headers['console-version']
                });
            });
        }
    };
};