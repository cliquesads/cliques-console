/* jshint node: true */
'use strict';

module.exports = function(db, routers) {
    var organizations = require('../../app/controllers/organizations.server.controller')(db);
    var users = require('../controllers/users.server.controller')(db);
    /**
     * @apiDefine OrganizationSchema
     * @apiParam (Body (Organization Schema)) {ObjectId} [id]      Organization ID. Will be auto-generated for new organizations
     * @apiParam (Body (Organization Schema)) {String} [tstamp=Date.now] Date created
     * @apiParam (Body (Organization Schema)) {String} name        Organization name
     * @apiParam (Body (Organization Schema)) {ObjectId} owner     Ref to User object that represents the org "Owner"
     * @apiParam (Body (Organization Schema)) {String} [website]   URL to Organization website
     * @apiParam (Body (Organization Schema)) {String} address     Street address of Organization
     * @apiParam (Body (Organization Schema)) {String} [address2]  Optional 2nd line of street address (Apt., Suite, etc.)
     * @apiParam (Body (Organization Schema)) {String} city        Organization city
     * @apiParam (Body (Organization Schema)) {String} state       State or region of organization
     * @apiParam (Body (Organization Schema)) {String} country     Org country code in [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) format
     * @apiParam (Body (Organization Schema)) {String} zip         Org zip/postal code
     * @apiParam (Body (Organization Schema)) {String} phone       Org phone number
     * @apiParam (Body (Organization Schema)) {ObjectId} accesscode ObjectId ref to AccessCode object used to gain access to Cliques
     * @apiParam (Body (Organization Schema)) {ObjectId[]} termsAndConditions Array of ObjectId refs to T&C objects
     * @apiParam (Body (Organization Schema)) {String} additionalTerms Any additional terms agreed upon by this particular organization
     * @apiParam (Body (Organization Schema)) {Object[]} [accessTokens] Array of AccessToken objects issued by Organization. AccessToken is issued when
     *  an invite to this organization's Cliques space is sent.
     * @apiParam (Body (Organization Schema)) {ObjectId} [accessTokens.id]     AccessToken ID
     * @apiParam (Body (Organization Schema)) {String} [accessTokens.tstamp=Date.now]  Date of creation of access token
     * @apiParam (Body (Organization Schema)) {String=admin,readWrite,readOnly} [accessTokens.role=readWrite]  Role that this user will be assigned when access token is redeemed
     * @apiParam (Body (Organization Schema)) {String} accessTokens.firstName  First name of invited user
     * @apiParam (Body (Organization Schema)) {String} accessTokens.lastName   Last name of invited user
     * @apiParam (Body (Organization Schema)) {String} accessTokens.email      User's email address. Used to send invite.
     * @apiParam (Body (Organization Schema)) {Boolean} [accessTokens.expired=false] whether token has expired or not. Will be set to expired when
     *  redeemed by user.
     *
     * @apiParam (Body (Organization Schema)) {Object[]} [promos]          Array of Promo objects to be used by Organization
     * @apiParam (Body (Organization Schema)) {ObjectId} [promos.id]       ObjectId of promo
     * @apiParam (Body (Organization Schema)) {String=advertiser,publisher} promos.type    Type of Promo, either `advertiser` or `publisher`.
     *  This will determine how to treat signs of promo amounts.
     * @apiParam (Body (Organization Schema)) {String} promos.description  Human-readable description of promo
     * @apiParam (Body (Organization Schema)) {Number} promos.promoAmount  Amount in USD to
     *  either add or deduct from billing total.
     * @apiParam (Body (Organization Schema)) {Boolean} [promos.active=true] Whether promo is still active or not.
     * @apiParam (Body (Organization Schema)) {String} [promos.promoInterval] Not frequently used. Supposed to represent "interval"
     *  of time for which this promo is valid, but currently not used by any.
     * @apiParam (Body (Organization Schema)) {Number} [promos.percentage] Percentage discount or bonus to be applied. Not frequently used.
     * @apiParam (Body (Organization Schema)) {String} [promos.minimumSpend] Minimum spend required before promo kicks in. Not frequently used.
     * @apiParam (Body (Organization Schema)) {Number[]} payments Array of Payment ID's, numbers that are object ID's of [Payment](#api-Payments) objects.
     *
     * @apiParam (Body (Organization Schema)) {Object[]} fees Array of fee objects, representing
     *  a fee structure for each Organization Type this Org has.
     * @apiParam (Body (Organization Schema)) {String=advertiser,publisher} fees.type type of this fee structure, either `advertiser` or `publisher`.
     * @apiParam (Body (Organization Schema)) {Number} [fees.percentage=0.1] Percentage of ad-spend or revenue warranted by this fee.
     * @apiParam (Body (Organization Schema)) {Number} [fees.fixedFee]       Not frequently used, meant to store fixed dollar fees charged to clients
     * @apiParam (Body (Organization Schema)) {Number} [fees.fixedFeeInterval]  Not frequently used, meant to store interval of time for which fixed fee is valid
     * @apiParam (Body (Organization Schema)) {String[]=advertiser,publisher,networkAdmin} [organization_types=['advertiser']]    Array of
     *  types of account that this Organization represents. Since it's an array, an org can have multiple types, but right now
     *  only one is used. Set as an array for future-proofing.
     * @apiParam (Body (Organization Schema)) {ObjectID[]} [users] Array of [User](#api-User) ObjectId's referencing
     *  all users who belong to this org. The mapping is kept on both objects for convenience.
     * @apiParam (Body (Organization Schema)) {String=Stripe,Check,PayPal} [billingPreference=Check] Organization billing preference.
     *  Only `Stripe` and `Check` are used right now.
     * @apiParam (Body (Organization Schema)) {String[]} [billingEmails] Array of additional emails to send billing
     *  statements to.
     * @apiParam (Body (Organization Schema)) {Boolean} sendStatementToOwner Whether to send statement to Organization `owner`
     *  or not.
     * @apiParam (Body (Organization Schema)) {String} [stripeCustomerId] If `billingPreference = 'Stripe'` and
     *  `organization_types` contains `advertiser`, this field stores this Organization's Stripe Customer ID, the ID of
     *  the Stripe Customer object for this org.
     * @apiParam (Body (Organization Schema)) {String} [stripeAccountId] If `billingPreference = 'Stripe'` and
     *  `organization_types` contains `publisher`, this field stores this Organization's Stripe Account ID, the ID of
     *  the Stripe Connected Account object for this org.
     * @apiParam (Body (Organization Schema)) {String} [qboVendorId] If `billingPreference = 'Check'` and
     *  `organization_types` contains `publisher`, this field stores this Organization's Quickbooks Vendor ID, the ID of
     *  the Quickbooks Vendor object for this org.
     * @apiParam (Body (Organization Schema)) {String} [qboCustomerId] If `billingPreference = 'Check'` and
     *  `organization_types` contains `advertiser`, this field stores this Organization's Quickbooks Customer ID, the ID of
     *  the Quickbooks Customer object for this org.
     */

    // Organization Routes
    /**
     * @api {post} /organization Create a New Organization
     * @apiName CreateOrganization
     * @apiGroup Organization
     * @apiDescription Create a new Organization. Pass a new Organization object in the request `body`.
     *
     * # Permissions
     * Because this endpoint, along with several Organization endpoints, are needed in the signup process,
     * no authentication is performed on POST or GET requests to this endpoint.
     *
     * Also, the URL below is wrong, but APIDoc doesn't allow you to specify a separate base URL for API endpoints.
     * All endpoints with no authentication are not prefixed with the `api/` path, instead are rooted at `/`.
     * So the URL really should be:
     * ```
     * https://console.cliquesads.com/organization
     * ```
     *
     * @apiVersion 0.1.0
     * @apiPermission none
     * 
     * @apiUse OrganizationSchema
     *
     * @apiSuccess {Object} organization Organization object as response body, with some additional virtual attributes
     * @apiSuccess {Number} organization.accountBalance     Current total balance of all outstanding [Payments](#api-Payments)
     *  and Promos. Calculated and serialized as virtual property.
     * @apiSuccess {String} organization.effectiveOrgType   Takes the 0th element from the `organization_types` array
     * @apiSuccess {String} organization.URI    Virtual property for consistent, fully qualified URI created from `website`
     *  attribute. Since there's no URI validation on `website`, this can kind of be anything from a domain name to
     *  a secure, qualified URL w/ protocol prefix, so this attribute just normalizes this field and takes the guesswork
     *  out of it.
     */
    routers.noAuthRouter.route('/organization').post(organizations.create);
    /**
     * @api {get} /organization/:organizationId Get Organization
     * @apiName GetOrganization
     * @apiGroup Organization
     * @apiDescription Get Organization by ID.
     *
     * # Permissions
     * Because this endpoint, along with several Organization endpoints, are needed in the signup process,
     * no authentication is performed on POST or GET requests to this endpoint.
     *
     * Also, the URL below is wrong, but APIDoc doesn't allow you to specify a separate base URL for API endpoints.
     * All endpoints with no authentication are not prefixed with the `api/` path, instead are rooted at `/`.
     * So the URL really should be:
     *
     * ```
     * https://console.cliquesads.com/organization/:organizationId
     * ```
     *
     * @apiVersion 0.1.0
     * @apiPermission none
     *
     * @apiParam {ObjectId} organizationId Object ID of desired Organization object.
     * @apiSuccess {Object} ::organization:: Organization object as response body, see
     *  [Organization Schema](#api-Organization)
     */
    routers.noAuthRouter.route('/organization/:organizationId').get(organizations.read);
	
	
	routers.noAuthRouter.param('organizationId', organizations.organizationByID);

	var router = routers.apiRouter;

	routers.noAuthRouter.route('/organization').post(organizations.create);
	/**
	 * @api {get} /organization Get All Organizations
	 * @apiName GetAllOrganizations
	 * @apiGroup Organization
	 * @apiDescription Get all Organizations
	 *
	 * @apiVersion 0.1.0
	 * @apiPermission networkAdmin
	 *
	 * @apiSuccess {Object[]} ::organizations:: Array of Organization objects as response body, see
	 *  [Organization Schema](#api-Organization)
	 */
	router.route('/organization').get(organizations.hasAuthorization, organizations.getMany);
	
	router.route('/organization/:organizationId')
        /**
         * @api {patch} /organization/:organizationId Update Organization
         * @apiName UpdateOrganization
         * @apiGroup Organization
         * @apiDescription Update Organization by ID. Organization will be extended w/ request body.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {ObjectId} organizationId Object ID of desired Organization object.
         * @apiUse OrganizationSchema
         *
         * @apiSuccess {Object} ::organization:: Updated Organization object as response body, see
         *  [Organization Schema](#api-Organization)
         */
		.patch(organizations.hasAuthorization, organizations.update)
        /**
         * @api {delete} /organization/:organizationId Remove Organization
         * @apiName RemoveOrganization
         * @apiGroup Organization
         * @apiDescription Remove Organization by ID.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {ObjectId} organizationId Object ID of desired Organization object.
         * @apiUse OrganizationSchema
         *
         * @apiSuccess {Object} ::organization:: Organization object as response body, see
         *  [Organization Schema](#api-Organization)
         */
		.delete(organizations.hasAuthorization, organizations.remove);

	router.route('/organization/:organizationId/sendinvite')
        /**
         * @api {patch} /organization/:organizationId/sendinvite Send Invite to Organization Member
         * @apiName SendOrganizationInvite
         * @apiGroup Organization
         * @apiDescription Send invitation to join Organization on Cliques by existing member of organization.
         *  Requesting client must belong to this organization Organization in order to invite users. (And right now,
         *  also have readWrite access).
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {ObjectId} organizationId Object ID of desired Organization object.
         * @apiParam (Body) {Object[]} ::Users:: array of [User](#api-User) objects to create access tokens for.
         *
         * @apiSuccess {Object} ::organization:: Updated Organization object as response body, see
         *  [Organization Schema](#api-Organization)
         */
		.post(organizations.hasAuthorization, organizations.sendUserInvite);

	// Stripe Customer routes
	router.route('/organization/:organizationId/stripe-customer')
        /**
         * @api {get} /organization/:organizationId/stripe-customer Get Stripe Customer Object
         * @apiName GetStripeCustomer
         * @apiGroup Organization
         * @apiDescription Gets associated Stripe Customer object for this Organization (if applicable).
         *  Organization must have `stripeCustomerId`, or else this will return a 404. Mainly just a passthrough
         *  to the [retrieve customer Stripe API endpoint.](https://stripe.com/docs/api#retrieve_customer)
         *
         *  Stripe Customers represent Advertiser accounts in Stripe, i.e. paying customers. For full documentation
         *  on the Stripe Customer, read the [Stripe API docs here](https://stripe.com/docs/api#customer_object).
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {ObjectId} organizationId Object ID of desired Organization object.
         *
         * @apiSuccess {Object} ::StripeCustomer:: the associated Stripe Customer object. For all fields, see
         *  the [Stripe Customer Object](https://stripe.com/docs/api#customer_object).
         */
		.get(organizations.hasAuthorization, organizations.stripeCustomer.getCustomer);

	router.route('/organization/:organizationId/stripe-customer/save-token')
		// TODO: this isn't really RESTful, requires queryparam to be passed through
        /**
         * @api {post} /organization/:organizationId/stripe-customer/save-token Save Stripe Customer Token
         * @apiName SaveStripeCustomerToken
         * @apiGroup Organization
         * @apiDescription Saves Stripe token as a payment "source" to this Organization's Stripe Customer object.
         *
         * If Organization doesn't yet have a CustomerID, will create new Customer, then save the token. The new Customer's
         * ID will be saved to Organization under `stripeCustomerId`.
         *
         * If Organization DOES have CustomerID, saves new token to existing Customer.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {ObjectId} organizationId Object ID of desired Organization object.
         *
         * @apiSuccess {Object} ::Organization:: Updated Organization object as response body, see
         *  [Organization Schema](#api-Organization)
         */
		.post(organizations.hasAuthorization, organizations.stripeCustomer.saveToken);

	// Stripe Account (i.e. Publisher) routes
	router.route('/organization/:organizationId/stripe-account')
        /**
         * @api {get} /organization/:organizationId/stripe-account Get Stripe Account Object
         * @apiName GetStripeAccount
         * @apiGroup Organization
         * @apiDescription Gets associated Stripe Account object for this Organization (if applicable).
         *  Organization must have `stripeCustomerId`, or else this will return a 404. Mainly just a passthrough
         *  to the [retrieve account Stripe API endpoint.](https://stripe.com/docs/api#retrieve_account)
         *
         *  Stripe Accounts represent Publisher accounts in Stripe, i.e. bank accounts of publishers in which we
         *  deposit money. For full documentation on the Stripe Account, read the [Stripe API docs here]
         *  (https://stripe.com/docs/api#account_object).
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {ObjectId} organizationId Object ID of desired Organization object.
         *
         * @apiSuccess {Object} ::StripeAccount:: the associated Stripe Account object. For all fields, see
         *  the [Stripe Account Object](https://stripe.com/docs/api#account_object).
         */
		.get(organizations.hasAuthorization, organizations.stripeAccount.getAccount);

	router.route('/organization/:organizationId/stripe-account/save-token')
	    // TODO: this isn't really RESTful, requires queryparam to be passed through
        /**
         * @api {get} /organization/:organizationId/stripe-account/save-token Save Stripe Account Token
         * @apiName SaveStripeCustomerToken
         * @apiGroup Organization
         * @apiDescription Saves Stripe token as an account to this Organization's Stripe Account object.
         *
         * If Organization doesn't yet have an AccountID, will create new Account, then save the token. The new Account's
         * ID will be saved to Organization under `stripeAccountId`.
         *
         * If Organization DOES have AccountID, saves new token to existing Account.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {ObjectId} organizationId Object ID of desired Organization object.
         *
         * @apiSuccess {Object} ::Organization:: Updated Organization object as response body, see
         *  [Organization Schema](#api-Organization)
         */
		.post(organizations.hasAuthorization, organizations.stripeAccount.saveToken);


	router.param('organizationId', organizations.organizationByID);


};