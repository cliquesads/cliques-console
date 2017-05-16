/* jshint node: true */ 'use strict';
var passport = require('passport');

module.exports = function(db, routers) {
	var users = require('../controllers/users.server.controller')(db);

	// Root routing
	var core = require('../../app/controllers/core.server.controller')(db);

	// Route index view directly to app, since router is used by both public API and console API
	routers.noAuthRouter.route('/').get(core.index);
};