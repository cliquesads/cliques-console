/* jshint node: true */
'use strict';

var organizations = require('../../app/controllers/organizations.server.controller');
var users = require('../controllers/users.server.controller');

module.exports = function(app, router) {
    // Organization Routes
    router.route('/organization').post(organizations.create);

	router.route('/organization/:organizationId')
		.get(organizations.read)
		.patch(users.requiresLogin, organizations.hasAuthorization, organizations.update)
		.delete(users.requiresLogin, organizations.hasAuthorization, organizations.remove);

	router.route('/organization/:organizationId/sendinvite').post(organizations.sendUserInvite);

	router.param('organizationId', organizations.organizationByID);
};