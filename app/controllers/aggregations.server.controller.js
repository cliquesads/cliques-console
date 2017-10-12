/* jshint node: true */ 'use strict';

var HourlyAdStatAPI = require('./aggregations/hourlyadstats.server.controller').HourlyAdStatsAPI,
    GeoAdStatAPI = require('./aggregations/geoadstats.server.controller').GeoAdStatAPI,
    KeywordAdStatAPI = require('./aggregations/keywordadstats.server.controller').KeywordAdStatAPI;

module.exports = function(db) {
    var hourlyAdStatAPI = new HourlyAdStatAPI(db);
    var geoAdStatAPI = new GeoAdStatAPI(db);
    var keywordAdStatAPI = new KeywordAdStatAPI(db);
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
            getMany: function(req, ers) {
                return keywordAdStatAPI.getMany(req, res);
            },
            getManyAdvertiserSummary: function(req, res) {
                return keywordAdStatAPI.getManyAdvertiserSummary(req, res);
            },
            getManyPublisherSummary: function(req, res) {
                return keywordAdStatAPI.getManyPublisherSummary(req, res);
            }
        }
    };
};