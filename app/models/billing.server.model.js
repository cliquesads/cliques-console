/**
 * Created by bliang on 6/5/16.
 */
/* jshint node: true */ 'use strict';

var mongoose = require('mongoose'),
    autoIncrement = require('mongoose-auto-increment'),
    _ = require('lodash'),
    mongooseApiQuery = require('mongoose-api-query'),
    Schema = mongoose.Schema,
    swig = require('swig'),
    config = require('config'),
    moment = require('moment-timezone');

var stripe = require('stripe')(config.get("Stripe.secret_key"));

/**
 * Constants
 */
var BILLING_METHODS = exports.BILLING_METHODS = ["Stripe", "Check","PayPal"];
var CONTRACT_TYPES = ["cpm_variable", "cpa_fixed", "cpm_fixed", "cpc_fixed"];
var PAYMENT_STATUSES = exports.PAYMENT_STATUSES = ["Needs Approval", "Pending", "Paid", "Overdue"];

/**
 * Separate schema to handle fee logic
 */
var FeeSchema = exports.FeeSchema = new Schema({
    type: { type: String, enum: ['advertiser', 'publisher'] },
    percentage: { type: Number, required: true, default: 0.10 },
    // Futureproofing, in case we ever charge fixed fees for something
    fixedFee: { type: Number, required: false },
    fixedFeeInterval: { type: String, required: false }
});

/**
 * Separate schema to handle promo
 */
var PromoSchema = exports.PromoSchema = new Schema({
    type: { type: String, enum: ['advertiser', 'publisher'] },
    description: { type: String, required: true },
    promoAmount: { type: Number, required: false },
    active: { type: Boolean, required: true, default: true },
    promoInterval: { type: String, required: false },
    percentage: { type: Number, required: false },
    minimumSpend: { type: Number, required: false }
});

/**
 * Abstraction of specific billing terms for special advertisers.
 */
var InsertionOrderSchema = exports.InsertionOrderSchema = new Schema({
    tstamp: { type: Date, default: Date.now },
    name: { type: String, required: true },
    // ALL BILLING PERIODS IN UTC ONLY
    start_date: { type: Date, required: true },
    // NOTE: For billing purposes, end_date is INCLUSIVE, so for full day
    // should be 23:59:59 UTC on last day of period
    end_date: { type: Date, required: true },
    notes: { type: String, required: false },
    organization: { type: Schema.ObjectId, required: true },
    contractType: { type: String, enum: CONTRACT_TYPES, required: true },
    CPM: { type: Number },
    CPC: { type: Number },
    CPAV: { type: Number },
    CPAC: { type: Number }
});

/**
 * Only allows one IO per org per timeframe, otherwise things get confusing.
 *
 * Checks if there are any other IO's w/ overlapping dates for same organization,
 * rejects save if there are.
 */
InsertionOrderSchema.pre('save', function(next){
    InsertionOrder.find({
        organization: this.organization,
        end_date: { $gte: this.start_date },
        start_date: { $lte: this.end_date }
    }).exec(function(err, results){
        if (err) {
            err = new Error(err);
            return next(err);
        }
        if (results && results.length > 0){
            var er = new Error("Error: InsertionOrder for this organization exists w/ overlapping dates.");
            return next(er);
        } else {
            return next();
        }
    });
});

InsertionOrderSchema.plugin(mongooseApiQuery, {});

var InsertionOrder = mongoose.model('InsertionOrder', InsertionOrderSchema);

// Flexible adjustments scheme for now, but could make more robust
// NOTE: Need to consider signing when adding adjustment--all publisher
// payments are recorded as negative totals, all advertiser payments
// are positive.
var AdjustmentSchema = new Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true }
});

/**
 * LineItem represents actual line on the invoice, i.e. specific billable item.
 */
var LineItemSchema = exports.LineItemSchema = new Schema({
    description: { type: String, required: true },
    lineItemType: { type: String, required: true, enum: ["Fee","RevShare","AdSpend","Revenue"]},
    // rate will mean different things depending on LI type and contract type, but
    // should be thought of as the rate used to arrive at the amount for this lineitem
    // (CPM, fee %, etc.)
    rate: { type: Number, required: true },

    // this will be 'spend' from HourlyAdStats if cpm_variable, otherwise schema
    // method will handle
    amount: { type: Number, required: true },

    units: { type: Number, required: true, default: 0 },

    // Fields below are specific to "Ad-Spend" and "Revenue" types
    // TODO: seems redundant to have contractType here and on IO, but might be useful for
    // TODO: record keeping purposes
    contractType: { type: String, enum: CONTRACT_TYPES, default: 'cpm_variable' },
    // Optionally link to special insertion order
    insertionOrder: { type: Schema.ObjectId, ref: 'InsertionOrder' },

    // Include all relevant billing stats for invoice calculation
    imps: { type: Number, min: 0 },
    clicks: { type: Number, min: 0 },
    view_convs: { type: Number, min: 0 },
    click_convs: { type: Number, min: 0 },
    spend: { type: Number, min: 0 }
});

/**
 * Schema to persist all incoming & outgoing payment data, w/ ref to organization.
 *
 * One document = one payment in or out.
 *
 * !!!!!! NOTE ON SIGNS !!!!!!!:
 * - RECEIVABLE payments (i.e. advertiser payments) are recorded with a POSITIVE sign.
 * - PAYABLE payments (i.e. publisher payments) are recorded as NEGATIVE.
 */
var PaymentSchema = new Schema({
    tstamp: { type: Date, default: Date.now },
    // ALL BILLING PERIODS IN UTC ONLY
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    organization: { type: Schema.ObjectId, ref: 'Organization', required: true },
    paymentType: { type: String, enum: ["advertiser","publisher"], required: true },

    adjustments: [AdjustmentSchema],
    private_notes: { type: String },
    public_notes: { type: String },
    status: { type: String, enum: PAYMENT_STATUSES },

    // Fee schema to be copied from organization on creation
    fee: FeeSchema,
    // Lineitems to represent items being charged on invoice
    lineItems: [LineItemSchema],
    invoicePath: { type: String }
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});


/**
 * Commonly used QB account IDs & Names, and mappings to lineItemTypes or promo/adjustment types
 */
var QBO_ACCOUNT_IDS = exports.QBO_ACCOUNT_IDS = {
    "AdSpend": {
        value: "53",
        name: "Sales Of Product Income"
    },
    "RevShare": {
        value: "75",
        name: "Publisher Revenue Share"
    },
    "Revenue": {
        value: "68",
        name: "Advertising Impressions"
    },
    "Fee": {
        value: "85",
        name: "Advertiser Platform Fees"
    },
    "publisher_promo": {
        value: "82",
        name: "Publisher Promotions"
    },
    "advertiser_promo": {
        value: "86",
        name: "Advertiser Promotions"
    },
    "negative_adjustments": {
        value: "83",
        name: "Negative Invoice Adjustments"
    },
    "positive_adjustments": {
        value: "84",
        name: "Positive Invoice Adjustments"
    }
};

/**
 * Maps payment lineItems to QuickBooks Bill "line" sub-objects
 */
PaymentSchema.methods.getQboBillLines = function(){
    var lines = [];
    var self = this;
    // need to flip the signs for all lineitems if payment is publisher payment
    // b/c all publisher / outgoing payments recorded w/ negative signs
    var sign = this.paymentType === 'publisher' ? -1 : 1;
    // Add lineItem lines first
    var line;
    this.lineItems.forEach(function(lineItem){
        line = {
            "Description": "Statement #" + self._id + ": " + lineItem.description,
            "Amount": sign * lineItem.amount,
            "DetailType": "AccountBasedExpenseLineDetail",
            "AccountBasedExpenseLineDetail": {
                "AccountRef": QBO_ACCOUNT_IDS[lineItem.lineItemType]
            }
        };
        lines.push(line);
    });
    // Now add adjustments, if any
    if (!_.isNil(this.adjustments)){
        this.adjustments.forEach(function(adjustment){
            var adjustment_key = adjustment.amount < 0 ? "negative_adjustments" : "positive_adjustments";
            line = {
               "Description": "Statement #" + self._id + ": " + adjustment.description,
               "Amount": sign * adjustment.amount,
               "DetailType": "AccountBasedExpenseLineDetail",
               "AccountBasedExpenseLineDetail": {
                   "AccountRef": QBO_ACCOUNT_IDS[adjustment_key]
               }
            };
        });
    }
    return lines;
};

/**
 * Handler to add payment to corresponding Organization.payments
 *
 * Hooked into post-init signal, but made an instance method for convenience
 *
 * @param callback
 */
PaymentSchema.methods.addToOrganization = function(callback){
    var self = this;

    var _doTheActualThing = function(err, payment){
        if (err) return callback(err);
        var org = payment.organization;
        // add payment to organization.payments
        if (!_.isNil(org.payments) && org.payments.length >= 0) {
            // make sure payment hasn't already been added
            var existingPayment = _.find(org.payments, function(p){ return p._id === self._id; });
            if (!existingPayment){
                org.payments.push(self._id);
            }
        } else {
            org.payments = [self._id];
        }
        org.save(callback);
    };

    // check if org is populated first to save a trip to the DB
    if (self.populated('organization')){
        _doTheActualThing(null, self);
    } else {
        self.populate('organization', function(err, payment){
            _doTheActualThing(err, payment);
        });
    }
};

/**
 * Post-init hook saves reciprocal Organization ref to Payment as well
 *
 * wrapper for PaymentSchema.addToOrganization
 */
// PaymentSchema.post('init', function(doc){
//     doc.addToOrganization(function(err, payment){
//         // TODO: not entirely sure what behavior should be here
//         if (err) return console.error(err);
//     });
// });

/**
 * Handles contract type logic to calculate media spend amount of invoice, sets `this.amount`
 *
 * Also sets `this.rate`, since this is a byproduct of the media spend calculation
 *
 * NOTE: this.type must be set.  If this.type is not "Ad-spend" or "Revenue", this
 * will not set amount or rate.
 *
 */
PaymentSchema.statics.lineItem_getSpendRelatedAmountAndRate = function(lineItem, insertionOrder){
    if (lineItem.lineItemType === "AdSpend" || lineItem.lineItemType === "Revenue"){
        var sign = lineItem.lineItemType === "AdSpend" ? 1: -1;
        switch (lineItem.contractType){
            // standard variable CPM exchange buy
            case "cpm_variable":
                lineItem.amount = sign * lineItem.spend;
                if (lineItem.imps){
                    lineItem.units = lineItem.imps;
                    lineItem.rate = lineItem.spend / lineItem.imps * 1000;
                } else {
                    lineItem.rate = 0;
                    lineItem.units = 0;
                }
                break;
            case "cpa_fixed":
                if (insertionOrder){
                    lineItem.amount = sign * ((insertionOrder.CPAC * lineItem.click_convs)
                        + (insertionOrder.CPAV * lineItem.view_convs));
                    // just take average of two, it doesn't really matter
                    lineItem.rate = (insertionOrder.CPAC + insertionOrder.CPAV)/ 2;
                    lineItem.units = (lineItem.click_convs + lineItem.view_convs);
                }
                break;
            case "cpc_fixed":
                if (insertionOrder){
                    lineItem.amount = sign * insertionOrder.CPC * lineItem.clicks;
                    lineItem.units = lineItem.clicks;
                    lineItem.rate = insertionOrder.CPC;
                }
                break;
            case "cpm_fixed":
                if (insertionOrder){
                    lineItem.amount = sign * insertionOrder.CPM * lineItem.imps / 1000;
                    lineItem.units = lineItem.imps;
                    lineItem.rate = insertionOrder.CPM;
                }
                break;
        }
        return lineItem;
    }
};

function formatPercentage(number, decimals){
    decimals = decimals || 1;
    return (number * 100).toFixed(decimals) + "%";
}

/**
 * Centralize logic to auto-generate lineitem description
 */
PaymentSchema.statics.lineItem_generateDescription = function(lineItem, relevantModel){
    switch (lineItem.lineItemType){
        case "Fee":
            lineItem.description = "Cliques Fees - " + formatPercentage(lineItem.rate, 1) + " of AdSpend";
            break;
        case "RevShare":
            lineItem.description = "Cliques Revenue Share - " + formatPercentage(lineItem.rate, 1) + " of Gross Revenue";
            break;
        case "AdSpend":
            switch (lineItem.contractType){
                case "cpm_variable":
                    lineItem.description = "Variable CPM Advertiser Impressions: " + relevantModel.name;
                    break;
                case "cpc_fixed":
                    lineItem.description = "CPC Media Spend: " + relevantModel.name;
                    break;
                case "cpm_fixed":
                    lineItem.description = "Fixed CPM Advertiser Impressions: " + relevantModel.name;
                    break;
                case "cpa_fixed":
                    lineItem.description = "CPA Media Spend: " + relevantModel.name;
                    break;
            }
            break;
        case "Revenue":
            lineItem.description = "CPM Impressions - Cliques Exchange: " + relevantModel.name;
            break;
    }
    return lineItem;
};

/**
 * Calculates advertiser fees / publisher rev-share based on cpm_variable lineitems
 *
 * NOTE: Only calculates fee/rev-share for cpm_variable for now because this is the
 * default contract_type.  Any insertion orders on top of this are assumed to have fees
 * "layered in".
 */
PaymentSchema.methods.calculateFeeOrRevShareLineItem = function(){
    var self = this;
    if (self.fee){
        var isAdvertiser = (this.paymentType === 'advertiser');
        var total = 0;
        self.lineItems.forEach(function(lineItem){
            if (lineItem.lineItemType === 'AdSpend' || lineItem.lineItemType === 'Revenue'){
                if (lineItem.contractType === 'cpm_variable'){
                    total += lineItem.amount;
                }
            }
        });
        // Only keep going if cpm_variable AdSpend or Revenue has been accrued
        // reason for this is that I can't think of a scenario now in which
        // we'd have an insertion order, but then charge a fee on adjustments.
        if (total){
            self.adjustments.forEach(function(adjustment){
                total += adjustment.amount;
            });
        }
        // Now add a "fee" or "rev-share" lineitem to payment
        // TODO: ignore "fixed_fee" in fee schema for now, don't have a use for it yet
        var feeLineItem = {
            amount: total * self.fee.percentage,
            rate: self.fee.percentage
        };
        if (isAdvertiser){
            feeLineItem.lineItemType = "Fee";
        } else {
            feeLineItem.lineItemType = "RevShare";
            // flip the sign on rev-shares.  Revenue is represented as negative,
            // so feeLineItem.amount will be negative as well.  This would mean that
            // when totalAmount sums all LI's, revShare will increase abs value
            // of the totalAmount, when it should do the opposite.
            feeLineItem.amount = feeLineItem.amount * -1;
        }
        // delegate description to static method
        feeLineItem = Payment.lineItem_generateDescription(feeLineItem);

        // debatable whether this is necessary, should probably be up to the caller to
        // figure out what to do with the lineitem.
        self.lineItems.push(feeLineItem);
        return feeLineItem;
    }
};

/**
 * Renders HTML invoice template from payment data.  Invoices reflect exactly one payment,
 * most of the presentation logic is written into the template.
 *
 * NOTE: Assumes that this.organization, this.organization.owner and
 * this.organization.termsAndConditions are all populated.
 * @param callback
 * @returns {*}
 */
PaymentSchema.methods.renderHtmlInvoice = function(callback){
    var self = this;
    var template = swig.compileFile('app/views/templates/billing/invoice.server.view.html');
    if (!_.isNil(this.organization.stripeCustomerId)){
        stripe.customers.retrieve(self.organization.stripeCustomerId)
            .then(function(customer){
                // populate template with default payment source object
                var defaultSourceId = customer.default_source;
                var source = _.find(customer.sources.data, function(source){ return source.id === defaultSourceId; });
                return callback(null, template({
                    payment: self,
                    stripeSource: source
                }));
            }, function(err){
                return callback(err);
            });
    } else if (!_.isNil(this.organization.stripeAccountId)){
        stripe.accounts.retrieve(self.organization.stripeAccountId)
            .then(function(account){
                //TODO: assume first source is default, which it is currently being treated as
                var source = account.external_accounts.data[0];
                return callback(null, template({
                    payment: self,
                    stripeSource: source
                }));
            }, function(err){
                return callback(err);
            });
    } else {
        return callback(null, template({ payment: self }));
    }
};

/**
 * Calculates payment totalAmount, sums all lineitems and adjustments
 *
 * @returns {*}
 */
PaymentSchema.virtual('totalAmount').get(function(){
    var totalAmount = _.sumBy(this.lineItems, "amount");
    // now add adjustments
    if (this.adjustments){
        totalAmount += _.sumBy(this.adjustments, "amount");
    }
    return totalAmount;
});

/**
 * Just sums `units` field for all lineitems
 *
 * @returns {*}
 */
PaymentSchema.virtual('totalUnits').get(function(){
    return _.sumBy(this.lineItems, "units");
});

/**
 * Centralize logic for days payable/receivable for different types of payments
 */
PaymentSchema.virtual('dueDate').get(function(){
    var PAYABLE_DAYS;
    switch (this.paymentType){
        case "advertiser":
            PAYABLE_DAYS = 15;
            break;
        case "publisher":
            PAYABLE_DAYS = 30;
    }
    return moment(this.tstamp).tz("UTC").add(PAYABLE_DAYS, "day").toDate();
});

PaymentSchema.plugin(mongooseApiQuery, {});
// Use auto-increment to generate human-readable indices, which will be used
// as invoice/statement numbers
PaymentSchema.plugin(autoIncrement.plugin, 'Payment');

var Payment = mongoose.model('Payment', PaymentSchema);