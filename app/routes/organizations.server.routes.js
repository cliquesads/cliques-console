/* jshint node: true */
'use strict';

var organizations = require('../../app/controllers/organizations.server.controller');
var users = require('../controllers/users.server.controller');

module.exports = function(app) {
    // Organization Routes
    app.route('/organization').post(organizations.create);

	app.route('/organization/:organizationId')
		.get(users.requiresLogin, organizations.hasAuthorization, organizations.read)
		.patch(users.requiresLogin, organizations.hasAuthorization, organizations.update)
		.delete(users.requiresLogin, organizations.hasAuthorization, organizations.remove);

	app.route('/organization/:organizationId/sendinvite').post(organizations.sendUserInvite);

	app.param('organizationId', organizations.organizationByID);
};