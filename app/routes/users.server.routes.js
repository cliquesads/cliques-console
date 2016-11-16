/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(db, routers) {

    /**
     * @apiDefine networkAdmin ORG: Cliques network admins
     * Members of the Cliques organization have the ability to see both Advertiser and Publisher
     * objects, and can view all objects in each collection.
     */

    /**
     * @apiDefine advertiser ORG: Advertiser accounts
     * Advertisers can view & edit any objects in the Advertiser section.
     */

    /**
     * @apiDefine publisher ORG: Publisher accounts
     * Advertisers can view & edit any objects in the Publisher section.
     */

	// User Routes
	var users = require('../../app/controllers/users.server.controller');

	// Setting up the users profile api
	routers.apiRouter.route('/users/me').get(users.me);
	routers.apiRouter.route('/users').put(users.update);

	routers.apiRouter.route('/users/avatar').post(upload.single('file'), users.createAvatar);
	routers.apiRouter.route('/users/accounts').delete(users.removeOAuthProvider);
	routers.apiRouter.route('/users/password').post(users.changePassword);

	// Setting up the users password api
	routers.noAuthRouter.route('/auth/forgot').post(users.forgot);
	routers.noAuthRouter.route('/auth/reset/:token').get(users.validateResetToken);
	routers.noAuthRouter.route('/auth/reset/:token').post(users.reset);

	// Setting up the users authentication api
	routers.noAuthRouter.route('/auth/signup').post(users.signup);
	routers.noAuthRouter.route('/auth/signin').post(users.signin);
	// this doesn't really need to be in noAuth router but it really doesn't matter
	routers.noAuthRouter.route('/auth/signout').get(users.signout);
	routers.noAuthRouter.route('/auth/is-username-taken/:username').get(users.isUsernameTaken);

	routers.noAuthRouter.route('/auth/access-signup').post(users.authorizeAccessCode);

    // Terms & Conditions Routes
	routers.noAuthRouter.route('/terms-and-conditions/current/:type').get(users.getCurrentTerms);
	routers.noAuthRouter.route('/terms-and-conditions/by-id/:termsId').get(users.read);

	// Finish by binding the user middleware
	routers.noAuthRouter.param('userId', users.userByID);
	routers.apiRouter.param('userId', users.userByID);
};