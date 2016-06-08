/* jshint node: true */
'use strict';

var organizations = require('../../app/controllers/organizations.server.controller');
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers) {

    // Organization Routes
    routers.noAuthRouter.route('/organization').post(organizations.create);

	var router = routers.apiRouter;

	router.route('/organization/:organizationId')
		.get(organizations.hasAuthorization, organizations.read)
		.patch(organizations.hasAuthorization, organizations.update)
		.delete(organizations.hasAuthorization, organizations.remove);

	router.route('/organization/:organizationId/sendinvite')
		.post(organizations.hasAuthorization, organizations.sendUserInvite);

	router.param('organizationId', organizations.organizationByID);
};