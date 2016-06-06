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
    paymentType: { type: String, enum: ["advertiser","publisher"], required: true},
    contractType: { type: String, enum: ["CPM", "CPC", "CPA", "Fixed CPM"] },

    // Include all relevant billing stats for invoice calculation
    imps: { type: Number, min: 0, required: true, default: 0 },
    spend: { type: Number, min: 0, required: true, default: 0 },
    clicks: { type: Number, min: 0, required: true, default: 0 },
    view_convs: { type: Number, min: 0, required: true, default: 0 },
    click_convs: { type: Number, min: 0, required: true, default: 0 },

    // Flexible adjustments scheme for now, but could make more robust
    adjustments: [{
        description: { type: String, required: true },
        amount: { type: Number, required: true }
    }],
    private_notes: { type: String },
    public_notes: { type: String },
    billingMethod: { type: String, enum: BILLING_METHODS, required: true },
    status: { type: String, enum: ["Pending", "Paid", "Overdue"] },
    fee: { type: FeeSchema, required: true },
    totalAmount: { type: Number, required: true },
    invoiceUrl: { type: String }
});

// Use auto-increment to generate human-readable indices, which will be used
// as invoice/statement numbers
PaymentSchema.plugin(autoIncrement.plugin, 'Payments');

var Payments = exports.Payments = mongoose.model('Payments', PaymentSchema);

PaymentSchema.methods.calculateTotalAmount = function(){
    
};