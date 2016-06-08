/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var organizations = require('../controllers/organizations.server.controller');

module.exports = function(db, routers){
    var aggregations = require('../controllers/aggregations.server.controller')(db);
    var advertisers = require('../controllers/advertisers.server.controller')(db);
    var publishers = require('../controllers/publishers.server.controller')(db);
    var cliques = require('../controllers/cliques.server.controller')(db);

    var router = routers.apiRouter;
    
    /* ---- HourlyAdStats API Routes ---- */

    /* ---- Param Middleware ---- */
    router.param('advertiser', advertisers.advertiserByID);
    router.param('publisher', publishers.publisherByID);

    // TODO: Don't know whether it makes sense to maintain two separate sets of
    // TODO: API endpoints -- one hierarchical based on path params and the other
    // TODO: non-hierarchical.  Need to choose one or the other, gets confusing
    // TODO: pretty quickly.

    /* ---- GENERAL ROUTES ---- */
    router.route('/hourlyadstat')
        .get(organizations.organizationHasAuthorization(['networkAdmin']), aggregations.hourlyAdStat.getMany);

    // TODO: Technically this isn't totally safe, someone could theoretically pass
    // TODO: in entity ID's for entities which did not belong to them.  However I think
    // TODO: the probability of someone knowing a Mongo ObjectID for another advertiser,
    // TODO: publisher etc. is pretty damn unlikely
    //
    // TODO: One solution could be to strip out any unsafe query params passed in
    // TODO: in the handler method, but I don't care enough about it to make this
    // TODO: a worthwhile exercise.
    router.route('/hourlyadstat/advSummary')
        .get(aggregations.hourlyAdStat.getManyAdvertiserSummary);
    router.route('/hourlyadstat/pubSummary')
        .get(aggregations.hourlyAdStat.getManyPublisherSummary);

    /* ---- ADVERTISER ROUTES ---- */
    router.route('/hourlyadstat/adv/:advertiser')
        .get(advertisers.hasAuthorization ,aggregations.hourlyAdStat.getManyAdvertiser);
    router.route('/hourlyadstat/adv/:advertiser/:campaign')
        .get(advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);
    router.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup')
        .get(advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);
    router.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup/:creative')
        .get(advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);

    /* ---- PUBLISHER ROUTES ---- */
    router.route('/hourlyadstat/pub/:publisher')
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    router.route('/hourlyadstat/pub/:publisher/:site')
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    router.route('/hourlyadstat/pub/:publisher/:site/:page')
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    router.route('/hourlyadstat/pub/:publisher/:site/:page/:placement')
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);

    /* ---- CLIQUE ROUTES ---- */
    router.route('/hourlyadstat/clique')
        .get(cliques.hasAuthorization, aggregations.hourlyAdStat.getManyClique);
};