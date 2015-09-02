/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var publishers = require('../controllers/publishers.server.controller')(app.db);

    /* ---- Publisher API Routes ---- */
    app.route('/publisher')
        .get(users.requiresLogin, publishers.getMany)
        .put(users.requiresLogin, publishers.hasAuthorization, publishers.updateOrCreate)
        .post(users.requiresLogin, publishers.create);

    app.route('/publisher/:publisherId')
        .get(users.requiresLogin, publishers.hasAuthorization, publishers.read)
        .patch(users.requiresLogin, publishers.hasAuthorization, publishers.update)
        .delete(users.requiresLogin, publishers.hasAuthorization, publishers.remove);

    app.route('/publisher/:publisherId/placement/:placementId')
        .get(users.requiresLogin, publishers.hasAuthorization, publishers.placement.getTag);

    app.param('publisherId', publishers.publisherByID);
};
