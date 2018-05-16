/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
const util = require('util'), aggregationUtils = require('./lib/aggregationUtils.server.controller.js'), HourlyAggregationPipelineVarBuilder = aggregationUtils.HourlyAggregationPipelineVarBuilder, AdStatsAPIHandler = aggregationUtils.AdStatsAPIHandler;

/**
 * Lightweight object to expose KeywordAdStats query methods to API routes.
 *
 * @param aggregationModels
 * @param advertiserModels
 * @param publisherModels
 * @constructor
 */
const KeywordAdStatAPI = exports.KeywordAdStatAPI = function(db) {
	this.adv_params = ['advertiser', 'campaign'];
	this.pub_params = ['publisher', 'site', 'page', 'placement'];
	this.clique_params = ['pub_clique', 'adv_clique'];
	this.keywords_params = ['keywords'];

	// TODO: Don't love this, should figure out better way to handle general queries
	let all_params = this.adv_params.concat(this.pub_params);
	all_params = all_params.concat(this.clique_params);
	all_params = all_params.concat(this.keywords_params);

	this.genPipelineBuilder = new HourlyAggregationPipelineVarBuilder([], all_params, 'hour');
	AdStatsAPIHandler.call(this, db);
};
util.inherits(KeywordAdStatAPI, AdStatsAPIHandler);

/*------------ General (non-path-param) methods ------------ */

KeywordAdStatAPI.prototype.getMany = function(req, res) {
	return this._getManyWrapper(this.genPipelineBuilder, this.aggregationModels.KeywordAdStat)(req, res);
};

/**
 * Basically just wraps getMany call in call to get user's advertisers,
 * then passes list of advertisers to getMany to match against.
 *
 * @param req
 * @param res
 * @return {*}
 */
KeywordAdStatAPI.prototype.getManyAdvertiserSummary = function(req, res) {
	const self = this;
	const filter_query = {};
	if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
		filter_query.organization = req.user.organization.id;
	}
	self.advertiserModels.Advertiser.find(filter_query, (err, advertisers) => {
		const ids = [];
		advertisers.forEach(doc => {
			ids.push(doc.id);
		});
		req.query.advertiser = ids.length > 1 ? `{in}${ids.join(',')}` : ids[0];
		return self._getManyWrapper(self.genPipelineBuilder, self.aggregationModels.KeywordAdStat)(req, res);
	});
};

/**
 * Basically just wraps getMany call in call to get user's publishers,
 * then passes list of publishers to getMany to match against.
 * 
 * @param req
 * @param res
 * @return {*}
 */
KeywordAdStatAPI.prototype.getManyPublisherSummary = function(req, res) {
	const self = this;
	const filter_query = {};
	// allow Advertisers & Admins to access publisher data
	if (req.user.organization.organization_types.indexOf('publisher') > -1) {
		filter_query.organization = req.user.organization.id;
	}
	self.publisherModels.Publisher.find(filter_query, (err, publishers) => {
		const ids = [];
		publishers.forEach(doc => {
			ids.push(doc.id);
		});
		req.query.publisher = ids.length > 1 ? `{in}${ids.join(',')}` : ids[0];
		return self._getManyWrapper(self.genPipelineBuilder, self.aggregationModels.KeywordAdStat)(req, res);
	});
};