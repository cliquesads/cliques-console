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

	router.route('/organization/:organizationId/sendinvite')
		.post(organizations.hasAuthorization, organizations.sendUserInvite);

	// Stripe Customer routes
	router.route('/organization/:organizationId/stripe-customer')
		.get(organizations.hasAuthorization, organizations.stripeCustomer.getCustomer);

	router.route('/organization/:organizationId/stripe-customer/save-token')
		// TODO: this isn't really RESTful, requires queryparam to be passed through
		.post(organizations.hasAuthorization, organizations.stripeCustomer.saveToken);

	// Stripe Account (i.e. Publisher) routes
	router.route('/organization/:organizationId/stripe-account')
		.get(organizations.hasAuthorization, organizations.stripeAccount.getAccount);

	router.route('/organization/:organizationId/stripe-account/save-token')
	// TODO: this isn't really RESTful, requires queryparam to be passed through
		.post(organizations.hasAuthorization, organizations.stripeAccount.saveToken);


	router.param('organizationId', organizations.organizationByID);


};