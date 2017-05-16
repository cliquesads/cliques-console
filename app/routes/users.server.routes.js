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
     * Publishers can view & edit any objects in the Publisher section.
     */

	// User Routes
	var users = require('../../app/controllers/users.server.controller')(db);

	/**
	 * @apiDefine UserSchema
	 * @apiSuccess (Success 200 (User Schema as Body)) {ObjectId} [id]           User ID. Will be auto-generated for new users.
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} firstName         User's first name
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} lastName         User's last name
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [displayName=firstName+lastName]    User's display name
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} email            User email address. Must be valid email address.
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} username         Unique username. Server will validate whether username is unique
     *  before saving.
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [username_lower] Lowercase version of username, used for indexing & uniqueness. Will be auto-generated
     *  on save.
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} password         User password. Only server-side requirement is that it must
     *  be longer than 6 characters
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [salt]           Password Salt, auto-generated if not provided
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} provider         Authentication provider string, indicating who is providing
     *  & storing user credentials. `local` indicates that the `local` provder is used, meaning username & password are stored
     *  on local machine. `facebook`, `twitter`, `linkedin` are other options not in use right now, but will be activated later on.
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [providerData]   Data used to access provider credntials. Can be anything.
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} additionalProvidersData Additional data used to access provider credntials.
     * @apiSuccess (Success 200 (User Schema as Body)) {String=admin,readWrite,readOnly} [roles=admin] **DEPRECATED**
	 * @apiSuccess (Success 200 (User Schema as Body)) {String=admin,readWrite,readOnly} [role=admin]  Single role field, user chooses one on behin
	 * @apiSuccess (Success 200 (User Schema as Body)) {String=America/New_York,America/Chicago,America/Denver/America/Los_Angeles} [tz=America/New_York] timezone 
     *  reporting is to be run in.
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [updated]        Date last updated
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [created=Date.now] Date created
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [resetPasswordToken] Expiration date
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [resetPasswordExpires] Reset date
	 * @apiSuccess (Success 200 (User Schema as Body)) {ObjectID} accesscode      ObjectID reference to AccessCode used to gain access to Cliques
	 * @apiSuccess (Success 200 (User Schema as Body)) {ObjectID} organization   ObjectID reference to parent Organization
	 * @apiSuccess (Success 200 (User Schema as Body)) {String} [avatarUrl]      Google Cloud Storage URL to Avatar image file
	 */

	// Setting up the users profile api
    /**
     * @api {get} /users/me Get User
     * @apiName GetUser
     * @apiGroup User
     * @apiVersion 0.1.0
     * @apiDescription Get User object for current session, or user passed in Basic Auth header.
     *
     * User represents individually authorized console User account. Each User belongs to an Organization, type of
     * that organization determines the type of permissions (`advertiser`, `publisher` or `networkAdmin`) that a User has.
     * See [Organization](#api-Organization) for details on Organizations.
     *
     * @apiPermission networkAdmin
     * @apiPermission advertiser
     * @apiPermission publisher
     *
     * @apiUse UserSchema
     */
	routers.apiRouter.route('/users/me').get(users.me);

    /**
     * @api {put} /users Update User
     * @apiName UpdateUser
     * @apiGroup User
     * @apiVersion 0.1.0
     * @apiDescription Update user profile data. No parameters provided, user being updated is requesting user as
     *  determined by session or Basic Auth header. Send updated user object in request body, user will be extended with
     *  parameters in body.
     *
     * @apiPermission networkAdmin
     * @apiPermission advertiser
     * @apiPermission publisher
     *
     * @apiParam (Body (User Schema)) ::UserSchema:: Updated User fields as request body. See [User Schema](#api-User) for full
     *  list of schema parameters.
     * @apiSuccess ::UserSchema:: Updated User object as response body. See [User Schema](#api-User) for full
     *  list of schema parameters.
     */
	routers.apiRouter.route('/users').put(users.update);

    /**
     * @api {post} /users/avatar Upload User Avatar
     * @apiName UploadAvatar
     * @apiGroup User
     * @apiVersion 0.1.0
     * @apiDescription Upload avatar image file for user to Google Cloud Storage.
     *
     * @apiPermission networkAdmin
     * @apiPermission advertiser
     * @apiPermission publisher
     *
     * @apiParam (multipart/form-data) {File} Avatar File object representing a profile avatar. No validation
     *  is currently performed server-side on this file, so make sure it is a valid avatar before uploading.
     *
     * @apiSuccess {Object} responseBody
     * @apiSuccess {String} responseBody.url Google Cloud Storage URL of newly uploaded file.
     */
	routers.apiRouter.route('/users/avatar').post(upload.single('file'), users.createAvatar);
	routers.apiRouter.route('/users/accounts').delete(users.removeOAuthProvider);
    /**
     * @api {post} /users/password Change User Password
     * @apiName ChangePassword
     * @apiGroup User
     * @apiVersion 0.1.0
     * @apiDescription Update user password. The user is determined either by session or Basic auth header,
     *  not passed in as ID.
     *
     * @apiPermission networkAdmin
     * @apiPermission advertiser
     * @apiPermission publisher
     *
     * @apiParam (Body (User Schema)) {String} currentPassword  Existing password for User.
     * @apiParam (Body (User Schema)) {String} newPassword   New password for User.
     * @apiParam (Body (User Schema)) {String} verifyPassword    Verified new password, will be checked against `newPassword` to verify that
     *  they are the same.
     *
     * @apiSuccess {String} message If successful, will get response with `message`: "Password changed successfully".
     */
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