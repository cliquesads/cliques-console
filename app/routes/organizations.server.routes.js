/* jshint node: true */
'use strict';

var organizations = require('../../app/controllers/organizations.server.controller');
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers) {

    // Organization Routes
    routers.noAuthRouter.route('/organization').post(organizations.create);
	routers.noAuthRouter.route('/organization/:organizationId').get(organizations.read);
	routers.noAuthRouter.param('organizationId', organizations.organizationByID);

	var router = routers.apiRouter;

	router.route('/organization/:organizationId')
		.patch(organizations.hasAuthorization, organizations.update)
		.delete(organizations.hasAuthorization, organizations.remove);

	router.route('/organization/:organizationId/stripetoken')
	// TODO: this isn't really RESTful, requires queryparam to be passed through
		.post(organizations.hasAuthorization, organizations.stripeCustomer.saveToken);

	router.route('/organization/:organizationId/stripecustomer')
	// TODO: this isn't really RESTful, requires queryparam to be passed through
		.get(organizations.hasAuthorization, organizations.stripeCustomer.getCustomer);

	router.route('/organization/:organizationId/sendinvite')
		.post(organizations.hasAuthorization, organizations.sendUserInvite);

	router.param('organizationId', organizations.organizationByID);
};