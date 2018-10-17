/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
const aggregationUtils = require('./lib/aggregationUtils.server.controller.js'),
    HourlyAggregationPipelineVarBuilder = aggregationUtils.HourlyAggregationPipelineVarBuilder,
    AdStatsAPIHandler = aggregationUtils.AdStatsAPIHandler;

/**
 * Lightweight object to expose KeywordAdStats query methods to API routes.
 *
 * @param aggregationModels
 * @param advertiserModels
 * @param publisherModels
 * @constructor
 */
exports.KeywordAdStatAPI = class KeywordAdStatAPI extends AdStatsAPIHandler {
    constructor(db) {
    	super(db);
        this.adv_params = ['advertiser', 'campaign'];
        this.pub_params = ['publisher', 'site', 'page', 'placement'];
        this.clique_params = ['pub_clique', 'adv_clique'];
        this.keywords_params = ['keywords'];

        // TODO: Don't love this, should figure out better way to handle general queries
        var all_params = this.adv_params.concat(this.pub_params);
        all_params = all_params.concat(this.clique_params);
        all_params = all_params.concat(this.keywords_params);

        this.genPipelineBuilder = new HourlyAggregationPipelineVarBuilder([], all_params, 'hour');
    }

    /*------------ General (non-path-param) methods ------------ */

    getMany(req, res) {
        return this.getManyWrapper(this.genPipelineBuilder, this.aggregationModels.KeywordAdStat)(req, res);
    }

    /**
     * Basically just wraps getMany call in call to get user's advertisers,
     * then passes list of advertisers to getMany to match against.
     *
     * @param req
     * @param res
     * @return {*}
     */
    getManyAdvertiserSummary(req, res) {
        const self = this;
        const filter_query = {};
        if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
            filter_query.organization = req.user.organization.id;
        }
        self.advertiserModels.Advertiser.find(filter_query, function(err, advertisers) {
            const ids = [];
            advertisers.forEach(function(doc) {
                ids.push(doc.id);
            });
            req.query.advertiser = ids.length > 1 ? '{in}' + ids.join(',') : ids[0];
            return self.getManyWrapper(self.genPipelineBuilder, self.aggregationModels.KeywordAdStat)(req, res);
        });
    }

    /**
     * Basically just wraps getMany call in call to get user's publishers,
     * then passes list of publishers to getMany to match against.
     *
     * @param req
     * @param res
     * @return {*}
     */
    getManyPublisherSummary(req, res) {
        const self = this;
        const filter_query = {};
        // allow Advertisers & Admins to access publisher data
        if (req.user.organization.organization_types.indexOf('publisher') > -1) {
            filter_query.organization = req.user.organization.id;
        }
        self.publisherModels.Publisher.find(filter_query, function(err, publishers) {
            const ids = [];
            publishers.forEach(function(doc) {
                ids.push(doc.id);
            });
            req.query.publisher = ids.length > 1 ? '{in}' + ids.join(',') : ids[0];
            return self.getManyWrapper(self.genPipelineBuilder, self.aggregationModels.KeywordAdStat)(req, res);
        });
    }
};
