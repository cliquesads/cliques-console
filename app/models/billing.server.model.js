/**
 * Created by bliang on 6/5/16.
 */
/* jshint node: true */ 'use strict';

var mongoose = require('mongoose'),
    autoIncrement = require('mongoose-auto-increment'),
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
    // ALL BILLING PERIODS IN UTC ONLY
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    organization: { type: Schema.ObjectId, required: true },
    contractType: { type: String, enum: CONTRACT_TYPES, required: true },
    CPM: { type: Number },
    CPC: { type: Number },
    CPAV: { type: Number },
    CPAC: { type: Number }
});

// Flexible adjustments scheme for now, but could make more robust
// NOTE: Need to consider signing when adding adjustment--all publisher
// payments are recorded as negative totals, all advertiser payments
// are positive.
var AdjustmentSchema = new Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true }
});

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
    organization: { type: Schema.ObjectId, required: true },
    // Optionally link to special insertion order
    insertionOrder: { type: Schema.ObjectId },
    paymentType: { type: String, enum: ["advertiser","publisher"], required: true},
    contractType: { type: String, enum: CONTRACT_TYPES },

    // Include all relevant billing stats for invoice calculation
    imps: { type: Number, min: 0, required: true, default: 0 },
    spend: { type: Number, min: 0, required: true, default: 0 },
    clicks: { type: Number, min: 0, required: true, default: 0 },
    view_convs: { type: Number, min: 0, required: true, default: 0 },
    click_convs: { type: Number, min: 0, required: true, default: 0 },

    adjustments: [AdjustmentSchema],
    private_notes: { type: String },
    public_notes: { type: String },
    billingMethod: { type: String, enum: BILLING_METHODS, required: true },
    status: { type: String, enum: ["Pending", "Paid", "Overdue"] },

    // Fee schema to be copied from organization on creation
    fee: FeeSchema,
    totalAmount: { type: Number, required: true },
    invoiceUrl: { type: String }
});

// Use auto-increment to generate human-readable indices, which will be used
// as invoice/statement numbers
PaymentSchema.plugin(autoIncrement.plugin, 'Payments');

var Payments = exports.Payments = mongoose.model('Payments', PaymentSchema);


/**
 * Handles contract type logic to calculate media spend component of invoice
 *
 * Result should be considered an absolute value, other methods will
 * sign as appropriate depending on context.
 *
 * NOTE: WILL ERROR IF INSERTIONORDER IS NOT POPULATED
 * @private
 */
PaymentSchema.methods._calculateUnsignedMediaSpend = function(){
    var mediaSpend;
    switch (this.contractType) {
        // standard variable CPM exchange buy
        case "cpm_variable":
            mediaSpend = this.spend;
            break;
        case "cpa_fixed":
            mediaSpend = (this.insertionOrder.CPAC * this.click_convs)
                + (this.insertionOrder.CPAV * this.view_convs);
            break;
        case "cpc_fixed":
            mediaSpend = this.insertionOrder.CPC * this.clicks;
            break;
        case "cpm_fixed":
            mediaSpend = this.insertionOrder.CPM * this.imps / 1000;
            break;
    }
    return mediaSpend;
};

/**
 * Calculates payment totalAmount, incorporating all contractType,
 * fee and adjustment logic
 *
 * @returns {*}
 */
PaymentSchema.methods.calculateTotalAmount = function(){
    var mediaSpend = this._calculateUnsignedMediaSpend(),
        fee = this.fee.percentage * mediaSpend,
        totalAmount;

    // Figure out signing and add fees
    if (this.paymentType === 'advertiser'){
        totalAmount = mediaSpend + fee;
    } else if (this.paymentType === 'publisher'){
        totalAmount = - mediaSpend + fee;
    }

    // now add adjustments
    if (this.adjustments){
        this.adjustments.forEach(function(adjustment){
            totalAmount += adjustment.amount;
        });
    }
    return totalAmount;
};