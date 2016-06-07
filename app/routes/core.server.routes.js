/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app, router) {
	// Root routing
	var core = require('../../app/controllers/core.server.controller')(app.db);

	// Route index view directly to app, since router is used by both public API and console API
	app.route('/').get(core.index);

	// Separate root paths for API's consumed by public and console.
	// Do this to support different authentication methods for API vs. Console,
	// but if there's a better way to handle this then I'm open to it
	app.use('/', router);
	app.use('/api/', router);
};