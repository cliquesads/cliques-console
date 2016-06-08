/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var organizations = require('../controllers/organizations.server.controller');
var passport = require('passport');

module.exports = function(app, routers){
    var publishers = require('../controllers/publishers.server.controller')(app.db);

    var router = routers.apiRouter;

    /* ---- Publisher API Routes ---- */
    router.route('/publisher')
        .get(publishers.getMany)
        .post(publishers.create);

    router.route('/sitesinclique/:cliqueId')
        .get(organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInClique);
    router.route('/sitesincliquebranch/:cliqueId')
        .get(organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInCliqueBranch);

    router.route('/publisher/:publisherId')
        .get(publishers.hasAuthorization, publishers.read)
        .patch(publishers.hasAuthorization, publishers.update)
        .delete(publishers.hasAuthorization, publishers.remove);

    router.route('/publisher/:publisherId/placement/:placementId')
        .get(publishers.hasAuthorization, publishers.placement.getTag);

    router.param('publisherId', publishers.publisherByID);
};
