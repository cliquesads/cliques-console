/* jshint node: true */ 'use strict';

module.exports = function(db, routers){
	var users = require('../controllers/users.server.controller')(db);
    var geo = require('../controllers/geo.server.controller.js')(db);
    var router = routers.apiRouter;

    /* ---- Advertiser API Routes ---- */
    router.route('/dma')
        .get(geo.getManyDmas);

    router.route('/dma/:dmaId')
        .get(geo.readDma);

    router.param('dmaId', geo.dmaByID);
};
