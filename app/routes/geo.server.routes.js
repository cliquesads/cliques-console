/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app, routers){
    var geo = require('../controllers/geo.server.controller.js')(app.db);
    var router = routers.apiRouter;

    /* ---- Advertiser API Routes ---- */
    router.route('/dma')
        .get(geo.getManyDmas);

    router.route('/dma/:dmaId')
        .get(geo.readDma);

    router.param('dmaId', geo.dmaByID);
};
