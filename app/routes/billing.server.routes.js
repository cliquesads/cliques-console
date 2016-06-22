/* jshint node: true */
'use strict';

var organizations = require('../../app/controllers/organizations.server.controller');
var billing = require('../../app/controllers/billing.server.controller');
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers) {
	var router = routers.apiRouter;

	router.route('/payment')
		.get(billing.payments.getMany);

	router.route('/payment/:paymentId')
		.get(billing.payments.hasAuthorization, billing.payments.read)
		.patch(organizations.organizationHasAuthorization(["networkAdmin"]), organizations.update);

	router.param('paymentId', billing.payments.paymentByID);
};