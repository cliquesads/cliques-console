/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app, router) {
	// Root routing
	var core = require('../../app/controllers/core.server.controller')(app.db);

	// Route index view directly to app, since router is used by both public API and console API
	app.route('/').get(core.index);
};