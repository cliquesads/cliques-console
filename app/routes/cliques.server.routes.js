/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers){
    var cliques = require('../controllers/cliques.server.controller')(db);
    var router = routers.apiRouter;

    /* ---- Advertiser API Routes ---- */
    router.route('/clique')
        .get(cliques.getMany)
        .put(cliques.hasAuthorization, cliques.updateOrCreate)
        .post(cliques.hasAuthorization, cliques.create);

    router.route('/clique/:cliqueId')
        .get(cliques.read)
        .patch(cliques.hasAuthorization, cliques.update)
        .delete(cliques.hasAuthorization, cliques.remove);

    router.param('cliqueId', cliques.cliqueByID);
};