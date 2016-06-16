/**
 * Created by bliang on 6/5/16.
 */
/* jshint node: true */ 'use strict';

var mongoose = require('mongoose'),
    autoIncrement = require('mongoose-auto-increment'),
    _ = require('lodash'),
    Schema = mongoose.Schema;

/**
 * Constants
 */
var BILLING_METHODS = exports.BILLING_METHODS = ["Stripe", "Check","PayPal"];
var CONTRACT_TYPES = ["cpm_variable", "cpa_fixed", "cpm_fixed", "cpc_fixed"];

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
    promoInterval: { type: String, required: false }
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

var InsertionOrder = exports.InsertionOrder = mongoose.model('InsertionOrder', InsertionOrderSchema);

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
var LineItemSchema = new Schema({
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ["Fee","Rev-share","Ad-spend","Revenue"]},
    // rate will mean different things depending on LI type and contract type, but
    // should be thought of as the rate used to arrive at the amount for this lineitem
    // (CPM, fee %, etc.)
    rate: { type: Number, required: true },

    // this will be 'spend' from HourlyAdStats if cpm_variable, otherwise schema
    // method will handle
    amount: { type: Number, required: true },

    // Fields below are specific to "Ad-Spend" and "Revenue" types
    // TODO: seems redundant to have contractType here and on IO, but might be useful for
    // TODO: record keeping purposes
    contractType: { type: String, enum: CONTRACT_TYPES, default: 'cpm_variable' },
    start_date: { type: Date },
    end_date: { type: Date },
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
 * Handles contract type logic to calculate media spend component of invoice
 *
 * Result should be considered an absolute value, other methods will
 * sign as appropriate depending on context.
 */
LineItemSchema.methods.calculateUnsignedMediaSpend = function(insertionOrder){
    var mediaSpend;
    switch (this.contractType){
        // standard variable CPM exchange buy
        case "cpm_variable":
            mediaSpend = this.spend;
            break;
        case "cpa_fixed":
            if (insertionOrder){
                mediaSpend = (insertionOrder.CPAC * this.click_convs)
                    + (insertionOrder.CPAV * this.view_convs);
            }
            break;
        case "cpc_fixed":
            if (insertionOrder){
                mediaSpend = insertionOrder.CPC * this.clicks;
            }
            break;
        case "cpm_fixed":
            if (insertionOrder){
                mediaSpend = insertionOrder.CPM * this.imps / 1000;
            }
            break;
    }
    return mediaSpend;
};

/**
 * Schema to persist all incoming & outgoing payment data, w/ ref to organization.
 *
 * One document = one payment in or out.
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
    billingMethod: { type: String, enum: BILLING_METHODS, required: true },
    status: { type: String, enum: ["Pending", "Paid", "Overdue"] },

    // Fee schema to be copied from organization on creation
    fee: FeeSchema,
    // Lineitems to represent items being charged on invoice
    lineItems: [LineItemSchema],
    invoiceUrl: { type: String }
});

// Use auto-increment to generate human-readable indices, which will be used
// as invoice/statement numbers
PaymentSchema.plugin(autoIncrement.plugin, 'Payment');

var Payment = exports.Payment = mongoose.model('Payment', PaymentSchema);

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