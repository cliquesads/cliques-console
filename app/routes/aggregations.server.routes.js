'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var aggregations = require('../controllers/aggregations.server.controller')(app.db);

    /* ---- Advertiser API Routes ---- */
    app.route('/hourlyadstat')
        .get(users.requiresLogin, aggregations.hourlyAdStat.getMany);
};
