/* jshint node: true */
'use strict';

var accesscode = require('../../app/controllers/accesscode.server.controller');

module.exports = function(db, routers) {
    var router = routers.apiRouter;
    
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
        .post(accesscode.create)
        /**
         * @api {get} /accesscode Get All AccessCodes
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
        .get(accesscode.getMany);

    router.route('/accesscode/:accessCodeId')
        /**
         * @api {post} /accesscode/:accessCodeId Get One Access Code
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
        .get(accesscode.hasAuthorization, accesscode.read)
        /**
         * @api {post} /accesscode/:accessCodeId Update Access Code
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
        .patch(accesscode.hasAuthorization, accesscode.update);

    router.route('/accesscode/:accessCodeId/send-to-user')
        .post(accesscode.hasAuthorization, accesscode.sendToUser);

    router.param('accessCodeId', accesscode.accessCodeByID);
};
