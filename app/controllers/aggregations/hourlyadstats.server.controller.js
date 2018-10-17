/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
const aggregationUtils = require('./lib/aggregationUtils.server.controller.js'),
    HourlyAggregationPipelineVarBuilder = aggregationUtils.HourlyAggregationPipelineVarBuilder,
    AdStatsAPIHandler = aggregationUtils.AdStatsAPIHandler;

/**
 * AdStatsAPIHandler subclass to handle HourlyAdStats model aggregations
 * @param db
 * @constructor
 */
exports.HourlyAdStatsAPI = class HourlyAdStatsAPI extends AdStatsAPIHandler {
    constructor(db){
        super(db);
        this.adv_params = ['advertiser','campaign','creativegroup','creative'];
        this.pub_params = ['publisher','site','page','placement'];
        this.clique_params = ['pub_clique', 'adv_clique'];
        //TODO: Don't love this, should figure out better way to handle general queries
        let all_params = this.adv_params.concat(this.pub_params);
        all_params = all_params.concat(this.clique_params);

        this.advPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.adv_params, this.pub_params, 'hour');
        this.pubPipelineBuilder = new HourlyAggregationPipelineVarBuilder(this.pub_params, this.adv_params, 'hour');
        this.cliquePipelineBuilder = new HourlyAggregationPipelineVarBuilder([], this.clique_params, 'hour');
        this.genPipelineBuilder = new HourlyAggregationPipelineVarBuilder([],all_params, 'hour');
    }

    // BEGIN actual methods to expose to API routes.
    // TODO: Don't know whether it makes sense to maintain two separate sets of
    // TODO: API endpoints -- one hierarchical based on path params and the other
    // TODO: non-hierarchical.  Need to choose one or the other, gets confusing
    // TODO: pretty quickly.

    /*------------ General (non-path-param) methods ------------ */
    getMany(req, res){
        return this.getManyWrapper(this.genPipelineBuilder, this.aggregationModels.HourlyAdStat)(req, res);
    }

    /**
     * Basically just wraps getMany call in call to get user's advertisers,
     * then passes list of advertisers to getMany to match against.
     *
     * @param req
     * @param res
     * @returns {*}
     */
    getManyAdvertiserSummary(req, res){
        const self = this;
        const filter_query = {};
        if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
            filter_query.organization = req.user.organization.id;
        }
        self.advertiserModels.Advertiser.find(filter_query, function(err, advertisers){
            const ids = [];
            advertisers.forEach(function(doc){
                ids.push(doc.id);
            });
            req.query.advertiser = ids.length > 1 ? '{in}' + ids.join(',') : ids[0];
            return self.getManyWrapper(self.genPipelineBuilder, self.aggregationModels.HourlyAdStat)(req, res);
        });
    }

    /**
     * Basically just wraps getMany call in call to get user's publishers,
     * then passes list of publishers to getMany to match against.
     *
     * @param req
     * @param res
     * @returns {*}
     */
    getManyPublisherSummary(req, res){
        const self = this;
        const filter_query = {};
        // allow Advertisers & Admins to access publisher data
        if (req.user.organization.organization_types.indexOf('publisher') > -1){
            filter_query.organization = req.user.organization.id;
        }
        self.publisherModels.Publisher.find(filter_query, function(err, publishers){
            const ids = [];
            publishers.forEach(function(doc){
                ids.push(doc.id);
            });
            req.query.publisher = ids.length > 1 ? '{in}' + ids.join(',') : ids[0];
            return self.getManyWrapper(self.genPipelineBuilder, self.aggregationModels.HourlyAdStat)(req, res);
        });
    }

    /*------------ Hierarchical, path-param methods ------------ */

    getManyAdvertiser(req, res){
        return this.getManyWrapper(this.advPipelineBuilder, this.aggregationModels.HourlyAdStat)(req, res);
    }
    getManyPublisher(req, res){
        return this.getManyWrapper(this.pubPipelineBuilder, this.aggregationModels.HourlyAdStat)(req, res);
    }
    getManyClique(req, res){
        return this.getManyWrapper(this.cliquePipelineBuilder, this.aggregationModels.HourlyAdStat)(req, res);
    }

};


