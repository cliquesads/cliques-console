/* jshint node: true */
'use strict';

var organizations = require('../../app/controllers/organizations.server.controller');
var billing = require('../../app/controllers/billing.server.controller');
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers) {
	var router = routers.apiRouter;

    /**
     * @apiDefine PaymentSchema
     * @apiSuccess {Object[]} payments              Array of Payment objects
     * @apiSuccess {ObjectId} [payments.id]                  ObjectId of Payment
     * @apiSuccess {String} [payments.tstamp=Date.now]       Date of creation
     * @apiSuccess {String} payments.start_date              Start datetime (UTC) of duration that this Payment pertains to. // ALL BILLING PERIODS IN UTC ONLY
     * @apiSuccess {String} payments.end_date                End datetime of duration that this Payment pertains to.
     * @apiSuccess {ObjectId} payments.organization          Organization that this payment belongs to.
     * @apiSuccess {String=advertiser,publisher} payments.paymentType Two types, `advertiser` for incoming advertiser payments,
     *  and `publisher` for outgoing publisher payments
     * @apiSuccess {Object[]} [payments.adjustments]         Array of objects representing adjustments made to payment total.
     * @apiSuccess {String} payments.adjustments.description Description of adjustment
     * @apiSuccess {Number} payments.adjustments.amount      Adjustment amount in USD.
     * @apiSuccess {String} [payments.private_notes]         Optional private notes, not to be shown on invoice / statement
     * @apiSuccess {String} [payments.private_notes]         Optional public_notes will be displayed on invoice / statement
     * @apiSuccess {String="Needs Approval","Pending","Paid","Overdue"} payments.status Payment status
     * @apiSuccess {Object} payments.fee Fee schema copied from organization when payment is created.
     * @apiSuccess {String=advertiser,publisher} payments.fees.type type of this fee structure, either `advertiser` or `publisher`.
     * @apiSuccess {Number} [payments.fee.percentage=0.1]    Percentage of ad-spend or revenue warranted by this fee.
     * @apiSuccess {Number} [payments.fee.fixedFee]          Not frequently used, meant to store fixed dollar fees charged to clients
     * @apiSuccess {Number} [payments.fee.fixedFeeInterval]  Not frequently used, meant to store interval of time for which
     * @apiSuccess {Object[]} payments.lineItems             LineItems to represent items being charged on invoice
     * @apiSuccess {ObjectId} [payments.lineItems.id]        LineItem ObjectId
     * @apiSuccess {String} payments.lineItems.description   Informative description of lineItem
     * @apiSuccess {String="Fee","RevShare","AdSpend","Revenue"} payments.lineItems.lineItemType One of four preset lineitem types.
     *  "Fee" = advertiser fee, "RevShare" = publisher rev-share, "AdSpend" = advertiser spend on media,
     *  "Revenue" = Revenue to publishers (not us)
     * @apiSuccess {Number} payments.lineItems.rate          Rate will mean different things depending on LI type and contract type, but
     *  should be thought of as the rate used to arrive at the amount for this lineitem (CPM, fee %, etc.)
     * @apiSuccess {Number} payments.lineItems.amount        This will be 'spend' from HourlyAdStats if `contractType == 'cpm_variable'`,
     *  otherwise schema method will handle
     * @apiSuccess {Number} [payments.lineItems.units=0]     Number of billable units delivered against this lineitem, e.g. impressions, clicks,
     *  conversions, whatever
     * @apiSuccess {String="cpa_fixed","cpm_fixed","cpc_fixed"} [payments.lineItems.contractType=cpm_variable] pricing structure for this lineitem.
     *  Specific to "Ad-Spend" and "Revenue" lineItemTypes
     * @apiSuccess {ObjectId} [payments.lineItems.insertionOrder]    Rarely used, but ObjectId ref to InsertionOrder model, which specifies
     *  fixed billing terms for this particular organization. Specific to "Ad-Spend" and "Revenue" types.
     * @apiSuccess {Number} [payments.lineItems.imps]        Impressions from HourlyAdStats for convenience
     * @apiSuccess {Number} [payments.lineItems.clicks]      Clicks from HourlyAdStats for convenience
     * @apiSuccess {Number} [payments.lineItems.view_convs]  View Conversions from HourlyAdStats for convenience
     * @apiSuccess {Number} [payments.lineItems.click_convs] Click Conversions from HourlyAdStats for convenience
     * @apiSuccess {Number} [payments.lineItems.spend]       Spend from HourlyAdStats for convenience
     * @apiSuccess {String} payments.invoicePath             Path to invoice on server
     */

    /**
     * @api {get} /payment-statuses Get Payment Status Types
     * @apiName GetPaymentStatuses
     * @apiGroup Payment
     * @apiDescription Get all payment status strings. This is only an API endpoint so these can be easily
     *  modified on the fly as need-be. It's pretty trivial otherwise.
     *
     * @apiVersion 0.1.0
     * @apiPermission networkAdmin
     * @apiPermission advertiser
     * @apiPermission publisher
     */
	router.route('/payment-statuses').get(billing.payments.getStatuses);

    /**
     * @api {get} /payment Get All Payments
     * @apiName GetAllPayment
     * @apiGroup Payment
     * @apiDescription Get all payments available to user. For `advertiser` and `publisher` users, this will
     *  be all payments belonging to their Organization. For `networkAdmin` users, this will be all payments.
     *
     *  # What is a Payment?
     *  Good question. A *Payment* is an object that represents a single incoming or outgoing payment from an
     *  [Organization](#api-Organization). It can be thought of as the data representation of a single invoice.
     *
     *  Within each Payment there are **lineItems**, which can be thought of as, well, line items on an invoice.
     *  These are the actual pertinent charges that were accrued during the invoice period. Most payment data actually
     *  belongs to these subdocuments.
     *
     *  # How are Payments Created?
     *  Also a good question. They are created by a script that runs once at the beginning of each month. You *cannot*
     *  create a payment via API, only read & update them.
     *
     * @apiVersion 0.1.0
     * @apiPermission networkAdmin
     * @apiPermission advertiser
     * @apiPermission publisher
     *
     * @apiUse PaymentSchema
     */
	router.route('/payment')
		.get(billing.payments.getMany);

	router.route('/payment/:paymentId')
        /**
         * @api {get} /payment/:paymentId Get Payment
         * @apiName GetPayment
         * @apiGroup Payment
         * @apiDescription Get Payment by ID.
         *
         * @apiVersion 0.1.0
         * @apiPermission advertiser
         * @apiPermission publisher
         * @apiPermission networkAdmin
         *
         * @apiParam {ObjectId} paymentId Object ID of desired Payment object.
         * @apiSuccess {Object} ::payment:: Payment object as response body, see
         *  [Payment Schema](#api-Payment)
         */
		.get(billing.payments.hasAuthorization, billing.payments.read)
        /**
         * @api {patch} /payment/:paymentId Update Payment
         * @apiName UpdatePayment
         * @apiGroup Payment
         * @apiDescription Update Payment by ID. Payment will be extended with request body.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam {ObjectId} paymentId Object ID of desired Payment object.
         * @apiSuccess {Object} ::payment:: Payment object as response body, see
         *  [Payment Schema](#api-Payment)
         */
		.patch(organizations.organizationHasAuthorization(["networkAdmin"]), billing.payments.update);

	router.route('/payment/:paymentId/setPaid')
        /**
         * @api {patch} /payment/:paymentId/setPaid Set Payment to Paid
         * @apiName SetPaymentPaid
         * @apiGroup Payment
         * @apiDescription Sets a Payment's `status` to `paid`, and applies & deactivates any promos saved on Org.
         *  as necessary.
         *
         *  *This endpoint should be used when payment needs to be set to `paid`.* If you set payment to `paid`
         *  through [Update Payment](#api-Payment-UpdatePayment) method, make sure you know what you're doing,
         *  as this can result in some `promos` getting used twice the next time a payment is applied to this organization.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam {ObjectId} paymentId Object ID of desired Payment object.
         * @apiSuccess {Object} ::payment:: Payment object as response body, see
         *  [Payment Schema](#api-Payment)
         */
		.patch(organizations.organizationHasAuthorization(["networkAdmin"]), billing.payments.setPaid );

	router.route('/payment/:paymentId/invoicePreview')
        /**
         * @api {get} /payment/:paymentId/invoicePreview Get Invoice Preview
         * @apiName GetInvoicePreview
         * @apiGroup Payment
         * @apiDescription Gets full HTML of invoice that would be rendered for this Payment.
         *
         * This endpoint generates HTML in real-time given current state of the Payment document,
         * rather than rendering an invoice from file. It's useful for previewing what the invoice will
         * look like in case you need to make any adjustments.
         *
         * To just get the invoice HTML from disk, please see [View Invoice](#api-Payment-ViewInvoice).
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam {ObjectId} paymentId Object ID of desired Payment object.
         */
		.get(billing.payments.hasAuthorization, billing.payments.getInvoicePreview);

	router.route('/payment/:paymentId/generateAndSendInvoice')
        /**
         * @api {post} /payment/:paymentId/generateAndSendInvoice Generate And Send Invoice
         * @apiName GenerateAndSendInvoice
         * @apiGroup Payment
         * @apiDescription Generates PDF & HTML copies of payment invoice, stores them server-side and emails the PDF
         *   invoice to the appropriate Organization Users, along with a friendly note.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam {ObjectId} paymentId Object ID of desired Payment object.
         * @apiSuccess {Object} ::payment:: Updated Payment object as response body, see
         *  [Payment Schema](#api-Payment)
         */
		.post(organizations.organizationHasAuthorization(["networkAdmin"]), billing.payments.generateAndSendInvoice);

	router.route('/payment/:paymentId/viewInvoice')
        /**
         * @api {get} /payment/:paymentId/viewInvoice View Invoice
         * @apiName ViewInvoice
         * @apiGroup Payment
         * @apiDescription Reads file stored at `payment.invoicePath` and renders it in response.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam {ObjectId} paymentId Object ID of desired Payment object.
         */
		.get(billing.payments.hasAuthorization, billing.payments.viewInvoice);

	router.param('paymentId', billing.payments.paymentByID);
};