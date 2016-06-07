/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app, router){
    var geo = require('../controllers/geo.server.controller.js')(app.db);

    /* ---- Advertiser API Routes ---- */
    router.route('/dma')
        .get(users.requiresLogin, geo.getManyDmas);

    router.route('/dma/:dmaId')
        .get(users.requiresLogin, geo.readDma);

    router.param('dmaId', geo.dmaByID);
};
