'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var aggregations = require('../controllers/aggregations.server.controller')(app.db);

    /* ---- HourlyAdStats API Routes ---- */

    /* ---- ADVERTISER ROUTES ---- */
    app.route('/hourlyadstat/adv/:advertiser')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup/:creative')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);

    /* ---- PUBLISHER ROUTES ---- */
    app.route('/hourlyadstat/pub/:publisher')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyPublisher);
    app.route('/hourlyadstat/pub/:publisher/:site')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyPublisher);
    app.route('/hourlyadstat/pub/:publisher/:site/:page')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyPublisher);
    app.route('/hourlyadstat/pub/:publisher/:site/:page/:placement')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyPublisher);

    /* ---- CLIQUE ROUTES ---- */
    app.route('/hourlyadstat/clique')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyClique);
};