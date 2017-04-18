/* jshint node: true */ 'use strict';

var HourlyAdStatAPI = require('./aggregations/hourlyadstats.server.controller').HourlyAdStatsAPI,
    GeoAdStatAPI = require('./aggregations/geoadstats.server.controller').GeoAdStatAPI;

module.exports = function(db) {
    var hourlyAdStatAPI = new HourlyAdStatAPI(db);
    var geoAdStatAPI = new GeoAdStatAPI(db);
    return {
        hourlyAdStat: {
            getMany: hourlyAdStatAPI.getMany,
            getManyAdvertiserSummary: hourlyAdStatAPI.getManyAdvertiserSummary,
            getManyPublisherSummary: hourlyAdStatAPI.getManyPublisherSummary,
            getManyAdvertiser: hourlyAdStatAPI.getManyAdvertiser,
            getManyPublisher: hourlyAdStatAPI.getManyPublisher,
            getManyClique: hourlyAdStatAPI.getManyClique,
            getLatestHour: function(callback){
                hourlyAdStatAPI.aggregationModels.HourlyAdStat.findOne().sort('-hour').exec(function(err, result){
                    if (err) return callback(err);
                    return callback(null, result.hour);
                });
            }
        },
        geoAdStat: {
            getMany: geoAdStatAPI.getMany,
            getManyAdvertiserSummary: geoAdStatAPI.getManyAdvertiserSummary,
            getManyPublisherSummary: geoAdStatAPI.getManyPublisherSummary,
            getLatestHour: function(callback){
                geoAdStatAPI.aggregationModels.GeoAdStat.findOne().sort('-hour').exec(function(err, result){
                    if (err) return callback(err);
                    return callback(null, result.hour);
                });
            }
        }
    };
};