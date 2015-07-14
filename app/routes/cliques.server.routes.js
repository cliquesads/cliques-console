'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var cliques = require('../controllers/cliques.server.controller')(app.db);

    /* ---- Advertiser API Routes ---- */
    app.route('/clique')
        .get(users.requiresLogin, cliques.getMany)
        .put(users.requiresLogin, cliques.hasAuthorization, cliques.updateOrCreate)
        .post(users.requiresLogin, cliques.hasAuthorization, cliques.create);

    app.route('/clique/:cliqueId')
        .get(users.requiresLogin, cliques.read)
        .patch(users.requiresLogin, cliques.hasAuthorization, cliques.update)
        .delete(users.requiresLogin, cliques.hasAuthorization, cliques.remove);

    app.param('cliqueId', cliques.cliqueByID);
};
