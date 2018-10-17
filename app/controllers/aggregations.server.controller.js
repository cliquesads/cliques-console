/* jshint node: true */ 'use strict';

const HourlyAdStatAPI = require('./aggregations/hourlyadstats.server.controller').HourlyAdStatsAPI,
    GeoAdStatAPI = require('./aggregations/geoadstats.server.controller').GeoAdStatAPI,
    KeywordAdStatAPI = require('./aggregations/keywordadstats.server.controller').KeywordAdStatAPI,
    DailyAdStatAPI = require('./aggregations/dailyadstats.server.controller').DailyAdStatAPI;

module.exports = function(db) {
    const hourlyAdStatAPI = new HourlyAdStatAPI(db);
    const geoAdStatAPI = new GeoAdStatAPI(db);
    const keywordAdStatAPI = new KeywordAdStatAPI(db);
    const dailyAdStatAPI = new DailyAdStatAPI(db);
    return {
        hourlyAdStat: {
            getMany: function(req, res) {
                return hourlyAdStatAPI.getMany(req, res);
            },
            getManyAdvertiserSummary: function(req, res) {
                return hourlyAdStatAPI.getManyAdvertiserSummary(req, res);
            },
            getManyPublisherSummary: function(req, res) {
                return hourlyAdStatAPI.getManyPublisherSummary(req, res);
            },
            getManyAdvertiser: function(req, res){
                return hourlyAdStatAPI.getManyAdvertiser(req, res);
            },
            getManyPublisher: function(req, res){
                return hourlyAdStatAPI.getManyPublisher(req, res);
            },
            getManyClique: function(req, res) {
                return hourlyAdStatAPI.getManyClique(req, res);
            },
            getLatestHour: function(callback){
                hourlyAdStatAPI.aggregationModels.HourlyAdStat.findOne().sort('-hour').exec(function(err, result){
                    if (err) return callback(err);
                    return callback(null, result ? result.hour : null);
                });
            }
        },
        geoAdStat: {
            getMany: function(req, res){
                return geoAdStatAPI.getMany(req, res);
            },
            getManyAdvertiserSummary: function(req, res){
                return geoAdStatAPI.getManyAdvertiserSummary(req, res);
            },
            getManyPublisherSummary: function(req, res) {
                return geoAdStatAPI.getManyPublisherSummary(req, res);
            }
        },
        keywordAdStat: {
            getMany: function(req, res) {
                return keywordAdStatAPI.getMany(req, res);
            },
            getManyAdvertiserSummary: function(req, res) {
                return keywordAdStatAPI.getManyAdvertiserSummary(req, res);
            },
            getManyPublisherSummary: function(req, res) {
                return keywordAdStatAPI.getManyPublisherSummary(req, res);
            }
        },
        dailyAdStat: {
            getMany: function(req, res) {
                return dailyAdStatAPI.getMany(req, res);
            },
            getManyAdvertiserSummary: function(req, res) {
                return dailyAdStatAPI.getManyAdvertiserSummary(req, res);
            },
            getManyPublisherSummary: function(req, res) {
                return dailyAdStatAPI.getManyPublisherSummary(req, res);
            }
        }
    };
};