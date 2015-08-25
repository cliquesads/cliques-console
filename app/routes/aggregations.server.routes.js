/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var aggregations = require('../controllers/aggregations.server.controller')(app.db);
    var advertisers = require('../controllers/advertisers.server.controller')(app.db);
    var publishers = require('../controllers/publishers.server.controller')(app.db);
    var cliques = require('../controllers/cliques.server.controller')(app.db);

    /* ---- HourlyAdStats API Routes ---- */

    /* ---- Param Middleware ---- */
    app.param('advertiser', advertisers.advertiserByID);
    app.param('publisher', publishers.publisherByID);

    /* ---- GENERAL ROUTE ---- */
    // TODO: FIX PERMISSIONS ISSUE HERE
    app.route('/hourlyadstat')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getMany);

    /* ---- ADVERTISER ROUTES ---- */
    app.route('/hourlyadstat/adv/:advertiser')
        .get(users.requiresLogin, advertisers.hasAuthorization ,aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign')
        .get(users.requiresLogin, advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup')
        .get(users.requiresLogin, advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup/:creative')
        .get(users.requiresLogin, advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);

    /* ---- PUBLISHER ROUTES ---- */
    app.route('/hourlyadstat/pub/:publisher')
        .get(users.requiresLogin, publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    app.route('/hourlyadstat/pub/:publisher/:site')
        .get(users.requiresLogin, publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    app.route('/hourlyadstat/pub/:publisher/:site/:page')
        .get(users.requiresLogin, publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    app.route('/hourlyadstat/pub/:publisher/:site/:page/:placement')
        .get(users.requiresLogin, publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);

    /* ---- CLIQUE ROUTES ---- */
    app.route('/hourlyadstat/clique')
        .get(users.requiresLogin, cliques.hasAuthorization, aggregations.hourlyAdStat.getManyClique);
};