'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var aggregations = require('../controllers/aggregations.server.controller')(app.db);
    /* ---- HourlyAdStats API Routes ---- */
    app.route('/hourlyadstat/adv/:advertiser')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);
    app.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup/:creative')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getManyAdvertiser);
    //app.route('/hourlyadstat/pub/:publisherId/:websiteId/:pageId/:placementId')
    //    .get(users.requiresLogin, aggregations.hourlyAdStat.getManyPublisher);
};