/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(app, router) {
	// User Routes
	var users = require('../../app/controllers/users.server.controller');

	// Setting up the users profile api
	router.route('/users/me').get(users.me);
	router.route('/users').put(users.update);
	router.route('/users/avatar').post(users.requiresLogin, upload.single('file'), users.createAvatar);
	router.route('/users/accounts').delete(users.removeOAuthProvider);

	// Setting up the users password api
	router.route('/users/password').post(users.changePassword);
	router.route('/auth/forgot').post(users.forgot);
	router.route('/auth/reset/:token').get(users.validateResetToken);
	router.route('/auth/reset/:token').post(users.reset);

	// Setting up the users authentication api
	router.route('/auth/signup').post(users.signup);
	router.route('/auth/signin').post(users.signin);
	router.route('/auth/signout').get(users.signout);
    router.route('/auth/is-username-taken/:username').get(users.isUsernameTaken);

    router.route('/auth/access-signup').post(users.authorizeAccessCode);

    // Terms & Conditions Routes
    router.route('/terms-and-conditions/current/:type').get(users.getCurrentTerms);
    router.route('/terms-and-conditions/by-id/:termsId').get(users.read);

	// Finish by binding the user middleware
	router.param('userId', users.userByID);
};