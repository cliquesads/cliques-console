/* jshint node: true */
'use strict';

const accesscodes = require('../../app/controllers/accesscode.server.controller');

module.exports = function(db, routers) {
    const router = routers.apiRouter;
    
    /**
     * @apiDefine AccessCodeSchema
     * @apiParam (Body (AccessCode Schema)) {ObjectId} [id]      AccessCode ID. Will be auto-generated for new accesscodes
     * @apiParam (Body (AccessCode Schema)) {String} [created=Date.now] Date created
     * @apiParam (Body (AccessCode Schema)) {String} code        The code string to be used. Must be unique.
     * @apiParam (Body (AccessCode Schema)) {Boolean} [active=true]     Active flag, defaults to true.
     * @apiParam (Body (AccessCode Schema)) {Object[]} fees             Array of fee objects to associate w/ this access code.
     *      Typically will have one `advertiser` type fee & one `publisher` type fee per code, but this is not enforced.
     * @apiParam (Body (AccessCode Schema)) {String=advertiser,publisher} fees.type Either `advertiser` or `publisher`
     * @apiParam (Body (AccessCode Schema)) {Number} [fees.percentage=0.10] Percent of media spend charged as fee.
     * @apiParam (Body (AccessCode Schema)) {Number} [fees.fixedFee] Fixed dollar amount fee, not really used yet.
     * @apiParam (Body (AccessCode Schema)) {String} [fees.fixedFeeInterval] Not used yet, ignore for now.
     * @apiParam (Body (AccessCode Schema)) {String} [fees.fixedFeeInterval] Not used yet, ignore for now.
     * @apiParam (Body (AccessCode Schema)) {ObjectId[]} [issuerOrgs] Array of Organization IDs indicating which organizations
     *      'issued' this accessCode, i.e. for referrals.
     * @apiParam (Body (AccessCode Schema)) {Object} [issuerSignupPromo] Promo object to be applied to issuer's account
     *      on successful signup with this code. Object details below.
     * @apiParam (Body (AccessCode Schema)) {ObjectId} [issuerSignupPromo.id]       ObjectId of promo
     * @apiParam (Body (AccessCode Schema)) {String=advertiser,publisher} issuerSignupPromo.type    Type of Promo, either `advertiser` or `publisher`.
     *  This will determine how to treat signs of promo amounts.
     * @apiParam (Body (AccessCode Schema)) {String} issuerSignupPromo.description  Human-readable description of promo
     * @apiParam (Body (AccessCode Schema)) {Number} issuerSignupPromo.promoAmount  Amount in USD to
     *  either add or deduct from billing total.
     * @apiParam (Body (AccessCode Schema)) {Boolean} [issuerSignupPromo.active=true] Whether promo is still active or not.
     * @apiParam (Body (AccessCode Schema)) {String} [issuerSignupPromo.promoInterval] Not frequently used. Supposed to represent "interval"
     *  of time for which this promo is valid, but currently not used by any.
     * @apiParam (Body (AccessCode Schema)) {Number} [issuerSignupPromo.percentage] Percentage discount or bonus to be applied. Not frequently used.
     * @apiParam (Body (AccessCode Schema)) {String} [issuerSignupPromo.minimumSpend] Minimum spend required before promo kicks in. Not frequently used.
     * @apiParam (Body (AccessCode Schema)) {Object} [issuerCampaignPromo]  Promo object to be applied to issuer's account
     *      when account created using access code creates a new campaign. See `issuerSignupPromo` for promo object details.
     * @apiParam (Body (AccessCode Schema)) {Object} [issuerSitePromo]  Promo object to be applied to issuer's account
     *      when account created using access code creates a new site. See `issuerSignupPromo` for promo object details.
     */
    router.route('/accesscode')
        /**
         * @api {post} /accesscode Create a New Access Code
         * @apiName CreateAccessCode
         * @apiGroup AccessCode
         * @apiDescription Create a new AccessCode, which is used to create a Cliques Account.
         *  Pass a new AccessCode object in the request `body`.
         *
         * @apiVersion 0.1.0
         * @apiPermission advertiser
         * @apiPermission publisher
         * @apiPermission networkAdmin
         *
         * @apiUse AccessCodeSchema
         *
         * @apiSuccess {Object} AccessCode AccessCode object as response body
         */
        .post(accesscodes.accessCode.create)
        /**
         * @api {get} /accesscodes.accessCode Get All AccessCodes
         * @apiName GetAccessCodes
         * @apiGroup AccessCode
         * @apiDescription Get all access codes available to your account. If you're a networkAdmin,
         *  this will be all access codes, if you're not, it will just be access codes you've created
         *  as the `issuerOrg`.
         *
         * @apiVersion 0.1.0
         * @apiPermission advertiser
         * @apiPermission publisher
         * @apiPermission networkAdmin
         *
         * @apiSuccess {Object[]} ::accessCodes:: Array of AccessCodes as response `body` (see [above](#api-AccessCode)
         *  for all fields).
         */
        .get(accesscodes.accessCode.getMany);

    router.route('/accesscode/:accessCodeId')
        /**
         * @api {get} /accesscode/:accessCodeId Get One Access Code
         * @apiName ReadAccessCode
         * @apiGroup AccessCode
         * @apiDescription Gets a single access code.
         *
         * @apiVersion 0.1.0
         * @apiPermission advertiser
         * @apiPermission publisher
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} accessCodeId ObjectID of AccessCode
         *
         * @apiSuccess {Object} ::accessCode:: AccessCode object as response body (see [above](#api-AccessCode)
         *  for all fields).
         */
        .get(accesscodes.accessCode.hasAuthorization, accesscodes.accessCode.read)
        /**
         * @api {patch} /accesscode/:accessCodeId Update Access Code
         * @apiName UpdateAccessCode
         * @apiGroup AccessCode
         * @apiDescription Updates an [AccessCode](#api-AccessCode) by ID. AccessCode will be updated completely
         *  with the contents of request `body`.
         *
         * @apiVersion 0.1.0
         * @apiPermission advertiser
         * @apiPermission publisher
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} accessCodeId ObjectID of AccessCode
         *
         * @apiSuccess {Object} ::accessCode:: Updated AccessCode object as response body (see [above](#api-AccessCode)
         *  for all fields).
         */
        .patch(accesscodes.accessCode.hasAuthorization, accesscodes.accessCode.update)
        /**
         * @api {delete} /accesscode/:accessCodeId Remove AccessCode
         * @apiName RemoveAccessCode
         * @apiGroup AccessCode
         * @apiDescription Removes an [AccessCode](#api-AccessCode) by ID.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} accessCode ObjectID of AccessCode
         *
         * @apiSuccess {Object} ::accesscode:: AccessCode object that was just removed as response `body`
         */
        .delete(accesscodes.accessCode.hasAuthorization, accesscodes.accessCode.remove);

    router.route('/accesscode/:accessCodeId/send-to-user')
        /**
         * @api {post} /accesscode/:accessCodeId/send-to-user Send Access Code to Users
         * @apiName SendAccessCode
         * @apiGroup AccessCode
         * @apiDescription Sends an [AccessCode](#api-AccessCode) email to users specified in request body.
         *
         * @apiVersion 0.1.0
         * @apiPermission advertiser
         * @apiPermission publisher
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters) {ObjectId} accessCodeId Object ID of AccessCode object.
         * @apiParam (Body) {Object[]} [users] array of [User](#api-User) objects to create access tokens for.
         * @apiParam (Body) {String} users.email email address
         * @apiParam (Body) {String} users.firstName first name
         * @apiParam (Body) {String} users.lastName last name
         */
        .post(accesscodes.accessCode.hasAuthorization, accesscodes.accessCode.sendToUser);

    router.param('accessCodeId', accesscodes.accessCode.accessCodeByID);

    /**
     * @api {get} /accesslink/:accessLinkId Get AccessLink
     * @apiName GetAccessLinkLoggedOut
     * @apiGroup AccessLink
     * @apiDescription Get AccessLink by ID.
     *
     * # Permissions
     * Because this endpoint is needed in the signup process,
     * no authentication is performed on POST or GET requests to this endpoint.
     *
     * Also, the URL below is wrong, but APIDoc doesn't allow you to specify a separate base URL for API endpoints.
     * All endpoints with no authentication are not prefixed with the `api/` path, instead are rooted at `/`.
     * So the URL really should be:
     *
     * ```
     * https://console.cliquesads.com/accesslink/:accessLinkId
     * ```
     *
     * @apiVersion 0.1.0
     * @apiPermission none
     *
     * @apiParam {ObjectId} accessLinkId Object ID of desired Access Link object.
     * @apiSuccess {Object} ::accessLink:: AccessLink object as response body, see
     *  [Access Link Schema](#api-AccessLink)
     */
    routers.noAuthRouter.route('/accesslink/:accessLinkId').get(accesscodes.accessLink.read);
    routers.noAuthRouter.param('accessLinkId', accesscodes.accessLink.accessLinkByID);

    /**
     * @apiDefine AccessLinkSchema
     * @apiParam (Body (AccessLink Schema)) {ObjectId} [id]      AccessLink ID. Will be auto-generated for new accesscodes
     * @apiParam (Body (AccessLink Schema)) {String} [created=Date.now] Date created
     * @apiParam (Body (AccessLink Schema)) {ObjectId} [createdBy=<User>] User (or User._id) of user who created this
     *      link, auto-generated.
     * @apiParam (Body (AccessLink Schema)) {Boolean} [expired=false]     Expired flag, defaults to false, will get set
     *      to true when link is used for successful signup.
     * @apiParam (Body (AccessLink Schema)) {String="advertiser","publisher","networkAdmin"} Type of organization that will be redeeming this access link.
     *      In the signup flow, if this is set, the "type" field will not appear and user will have no choice over what type of account thet set up.
     * @apiParam (Body (AccessLink Schema)) {ObjectId} [delegatedPublisher] ID of Publisher object the redeeming account will gain access to.
     *      On creation of Organization from this link, this publisher obj will get organization "ownership" (i.e. `publisher.organization`)
     *      set to ID of new org.
     * @apiParam (Body (AccessLink Schema)) {ObjectId} [delegatedAdvertiser] ID of Advertiser object the redeeming account will gain access to.
     *      On creation of Organization from this link, this advertiser obj will get organization "ownership" (i.e. `advertiser.organization`)
     *      set to ID of new org.
     * @apiParam (Body (AccessLink Schema)) {String} firstName first name of redeeming user.
     *      on successful signup with this code. Object details below.
     * @apiParam (Body (AccessLink Schema)) {String} lastName last name of redeeming user.
     * @apiParam (Body (AccessLink Schema)) {String} email redeeming user's email.
     */
    router.route('/accesslink')
        /**
         * @api {post} /accesslink Create a New Access Code
         * @apiName CreateAccessLink
         * @apiGroup AccessLink
         * @apiDescription Create a new AccessLink, which is used to create a Cliques Account.
         *  Pass a new AccessLink object in the request `body`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiUse AccessLinkSchema
         *
         * @apiSuccess {Object} AccessLink AccessLink object as response body
         */
        .post(accesscodes.accessLink.create)
        /**
         * @api {get} /accesscodes.accessLink Get All AccessLinks
         * @apiName GetAccessLinks
         * @apiGroup AccessLink
         * @apiDescription Get all access codes available to your account (networkAdmin only).
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiSuccess {Object[]} ::accessLinks:: Array of AccessLinks as response `body` (see [above](#api-AccessLink)
         *  for all fields).
         */
        .get(accesscodes.accessLink.getMany);

    router.route('/accesslink/:accessLinkId')
        /**
         * @api {patch} /accesslink/:accessLinkId Update Access Code
         * @apiName UpdateAccessLink
         * @apiGroup AccessLink
         * @apiDescription Updates an [AccessLink](#api-AccessLink) by ID. AccessLink will be updated completely
         *  with the contents of request `body`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} accessLinkId ObjectID of AccessLink
         *
         * @apiSuccess {Object} ::accessLink:: Updated AccessLink object as response body (see [above](#api-AccessLink)
         *  for all fields).
         */
        .patch(accesscodes.accessLink.hasAuthorization, accesscodes.accessLink.update)
        /**
         * @api {delete} /accesslink/:accessLinkId Remove AccessLink
         * @apiName RemoveAccessLink
         * @apiGroup AccessLink
         * @apiDescription Removes an [AccessLink](#api-AccessLink) by ID.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} accessLink ObjectID of AccessLink
         *
         * @apiSuccess {Object} ::accesslink:: AccessLink object that was just removed as response `body`
         */
        .delete(accesscodes.accessLink.hasAuthorization, accesscodes.accessLink.remove);

    router.route('/accesslink/:accessLinkId/send-to-user')
        /**
         * @api {post} /accesslink/:accessLinkId/send-to-user Send Access Code to Users
         * @apiName SendAccessLink
         * @apiGroup AccessLink
         * @apiDescription Sends an [AccessLink](#api-AccessLink) email to users specified in request body.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters) {ObjectId} accessLinkId Object ID of AccessLink object.
         * @apiParam (Body) {Object[]} [users] array of [User](#api-User) objects to create access tokens for.
         * @apiParam (Body) {String} users.email email address
         * @apiParam (Body) {String} users.firstName first name
         * @apiParam (Body) {String} users.lastName last name
         */
        .post(accesscodes.accessLink.hasAuthorization, accesscodes.accessLink.sendToUser);

    router.param('accessLinkId', accesscodes.accessLink.accessLinkByID);
};
