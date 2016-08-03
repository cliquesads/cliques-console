/* jshint node: true */
'use strict';

var organizations = require('../../app/controllers/organizations.server.controller');
var billing = require('../../app/controllers/billing.server.controller');
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers) {
	var router = routers.apiRouter;

	router.route('/payment-statuses').get(billing.payments.getStatuses);

	router.route('/payment')
		.get(billing.payments.getMany);

	router.route('/payment/:paymentId')
		.get(billing.payments.hasAuthorization, billing.payments.read)
		.patch(organizations.organizationHasAuthorization(["networkAdmin"]), billing.payments.update);

	router.route('/payment/:paymentId/setPaid')
		.patch(organizations.organizationHasAuthorization(["networkAdmin"]), billing.payments.setPaid );

	router.route('/payment/:paymentId/invoicePreview')
		.get(billing.payments.hasAuthorization, billing.payments.getInvoicePreview);

	router.route('/payment/:paymentId/generateAndSendInvoice')
		.post(organizations.organizationHasAuthorization(["networkAdmin"]), billing.payments.generateAndSendInvoice);

	router.route('/payment/:paymentId/viewInvoice')
		.get(billing.payments.hasAuthorization, billing.payments.viewInvoice);

	router.param('paymentId', billing.payments.paymentByID);
};