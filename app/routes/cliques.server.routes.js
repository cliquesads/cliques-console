/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app, router){
    var cliques = require('../controllers/cliques.server.controller')(app.db);

    /* ---- Advertiser API Routes ---- */
    router.route('/clique')
        .get(users.requiresLogin, cliques.getMany)
        .put(users.requiresLogin, cliques.hasAuthorization, cliques.updateOrCreate)
        .post(users.requiresLogin, cliques.hasAuthorization, cliques.create);

    router.route('/clique/:cliqueId')
        .get(users.requiresLogin, cliques.read)
        .patch(users.requiresLogin, cliques.hasAuthorization, cliques.update)
        .delete(users.requiresLogin, cliques.hasAuthorization, cliques.remove);

    router.param('cliqueId', cliques.cliqueByID);
};