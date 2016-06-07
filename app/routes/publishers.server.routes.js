/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var organizations = require('../controllers/organizations.server.controller');

module.exports = function(app, router){
    var publishers = require('../controllers/publishers.server.controller')(app.db);

    /* ---- Publisher API Routes ---- */
    router.route('/publisher')
        .get(users.requiresLogin, publishers.getMany)
        .post(users.requiresLogin, publishers.create);

    router.route('/sitesinclique/:cliqueId')
        .get(users.requiresLogin, organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInClique);
    router.route('/sitesincliquebranch/:cliqueId')
        .get(users.requiresLogin, organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInCliqueBranch);

    router.route('/publisher/:publisherId')
        .get(users.requiresLogin, publishers.hasAuthorization, publishers.read)
        .patch(users.requiresLogin, publishers.hasAuthorization, publishers.update)
        .delete(users.requiresLogin, publishers.hasAuthorization, publishers.remove);

    router.route('/publisher/:publisherId/placement/:placementId')
        .get(users.requiresLogin, publishers.hasAuthorization, publishers.placement.getTag);

    router.param('publisherId', publishers.publisherByID);
};
