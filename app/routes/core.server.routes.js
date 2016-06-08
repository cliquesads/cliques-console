/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var passport = require('passport');

module.exports = function(app, routers) {
	// Root routing
	var core = require('../../app/controllers/core.server.controller')(app.db);

	// Route index view directly to app, since router is used by both public API and console API
	routers.noAuthRouter.route('/').get(core.index);
};