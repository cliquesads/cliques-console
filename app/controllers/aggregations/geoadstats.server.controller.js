/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var util = require('util'),
    aggregationUtils = require('./lib/aggregationUtils.server.controller.js'),
    HourlyAggregationPipelineVarBuilder = aggregationUtils.HourlyAggregationPipelineVarBuilder,
    AdStatsAPIHandler = aggregationUtils.AdStatsAPIHandler;

/**
 * Lightweight object to expose GeoAdStats query methods to API routes.
 *
 * @param aggregationModels
 * @param advertiserModels
 * @param publisherModels
 * @constructor
 */
var GeoAdStatAPI = exports.GeoAdStatAPI = function(db){
    this.adv_params = ['advertiser','campaign'];
    this.pub_params = ['publisher','site','page'];
    this.clique_params = ['pub_clique', 'adv_clique'];
    this.geo_params = ['country','region','dma','city','zip'];
    // this.advPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.adv_params, this.pub_params.concat(this.geo_params), 'hour');
    // this.pubPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.pub_params, this.adv_params.concat(this.geo_params), 'hour');
    // this.cliquePipelineBuilder = new HourlyAggregationPipelineVarBuilder([], this.clique_params.concat(this.geo_params), 'hour');

    //TODO: Don't love this, should figure out better way to handle general queries
    var all_params = this.adv_params.concat(this.pub_params);
    all_params = all_params.concat(this.clique_params);
    all_params = all_params.concat(this.geo_params);
    this.genPipelineBuilder = new HourlyAggregationPipelineVarBuilder([],all_params, 'hour');
    AdStatsAPIHandler.call(this, db);
};
util.inherits(GeoAdStatAPI, AdStatsAPIHandler);

/*------------ General (non-path-param) methods ------------ */

GeoAdStatAPI.prototype.getMany = function(req, res){
    return this._getManyWrapper(this.genPipelineBuilder)(req, res);
};

/**
 * Basically just wraps getMany call in call to get user's advertisers,
 * then passes list of advertisers to getMany to match against.
 *
 * @param req
 * @param res
 * @returns {*}
 */
GeoAdStatAPI.prototype.getManyAdvertiserSummary = function(req, res){
    var self = this;
    var filter_query = {};
    if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
        filter_query.organization = req.user.organization.id;
    }
    self.advertiserModels.Advertiser.find(filter_query, function(err, advertisers){
        var ids = [];
        advertisers.forEach(function(doc){
            ids.push(doc.id);
        });
        req.query.advertiser = ids.length > 1 ? '{in}' + ids.join(',') : ids[0];
        return self._getManyWrapper(self.genPipelineBuilder)(req, res);
    });
};

/**
 * Basically just wraps getMany call in call to get user's publishers,
 * then passes list of publishers to getMany to match against.
 *
 * @param req
 * @param res
 * @returns {*}
 */
GeoAdStatAPI.prototype.getManyPublisherSummary = function(req, res){
    var self = this;
    var filter_query = {};
    // allow Advertisers & Admins to access publisher data
    if (req.user.organization.organization_types.indexOf('publisher') > -1){
        filter_query.organization = req.user.organization.id;
    }
    self.publisherModels.Publisher.find(filter_query, function(err, publishers){
        var ids = [];
        publishers.forEach(function(doc){
            ids.push(doc.id);
        });
        req.query.publisher = ids.length > 1 ? '{in}' + ids.join(',') : ids[0];
        return self._getManyWrapper(self.genPipelineBuilder)(req, res);
    });
};