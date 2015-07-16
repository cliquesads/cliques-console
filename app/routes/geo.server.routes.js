'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var geo = require('../controllers/geo.server.controller.js')(app.db);

    /* ---- Advertiser API Routes ---- */
    app.route('/dma')
        .get(users.requiresLogin, geo.getManyDmas);

    app.route('/dma/:dmaId')
        .get(users.requiresLogin, geo.readDma);

    app.param('dmaId', geo.dmaByID);
};
