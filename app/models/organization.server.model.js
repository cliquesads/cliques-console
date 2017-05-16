/* jshint node: true */ 'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto'),
    async = require('async'),
    _ = require('lodash'),
    user = require('./user.server.model'),
    billing = require('./billing.server.model');

/**
 * Small schema to store some important metadata about
 * Terms & Conditions agreements
 * @type {Schema}
 */
var termsAndConditionsSchema = new Schema({
    tstamp: {type: Date, default: Date.now},
    name: { type: String, required: true },
    type: {type: String, enum: ['advertiser', 'publisher']},
    templatePath: { type: String, required: true },
    url: {type: String, required: true },
    notes: { type: String, required: true },
    active: { type: Boolean, required: true, default: false }
});
exports.TermsAndConditions = mongoose.model('TermsAndConditions', termsAndConditionsSchema);

var accessTokenSchema = new Schema({
    _id: {type: Schema.ObjectId, required: true},
    tstamp: {type: Date, default: Date.now},
    role: {
        type: String,
        enum: user.USER_ROLES,
        default: 'readWrite'
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    expired: { type: Boolean, required: true, default: false }
});

/**
 * Organization is a collection of users
 *
 * @type {Schema}
 */
var organizationSchema = new Schema({
    tstamp: {type: Date, default: Date.now},
    name: { type: String, required: true },
    owner: { type: Schema.ObjectId, ref: 'User'},
    website: { type: String, required: false },
    address: { type: String, required: true },
    address2: { type: String, required: false },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zip: { type: String, required: true },
    phone: { type: String, required: true },
    accesscode: { type: Schema.ObjectId,ref: 'AccessCode' },
    // can agree to multiple terms & conditions
    termsAndConditions: [{ type: Schema.ObjectId,ref: 'TermsAndConditions' }],
    additionalTerms: { type: String, required: false },
    accessTokens: [accessTokenSchema],
    promos: [billing.PromoSchema],
    payments: [{ type: Number, ref: 'Payment'}],
    // TODO: Add validation to ensure only one active fee structure per org type
    fees: [billing.FeeSchema],
    organization_types: {
        type: [{
            type: String,
            enum: ['advertiser','publisher','networkAdmin']
        }],
        default: ['advertiser']
    },
    users: [{ type: Schema.ObjectId, ref: 'User'}],
    // Billing stuff
    billingPreference: { type: String, required: true, default: 'Check', enum: billing.BILLING_METHODS },
    billingEmails: [{ type: String}],
    sendStatementToOwner: { type: Boolean, required: true, default: true },
    stripeCustomerId: { type: String }, // for Advertisers
    stripeAccountId: { type: String }, // for Publishers

    // Quickbooks entity IDs
    qboVendorId: { type: String }, // for Publishers
    qboCustomerId: { type: String } // for Advertisers
},{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});


/**
 * accountBalance virtual property sums all outstanding invoices and active promos
 *
 * DOES NOT modify or "apply" any promos on org, should just be considered a "preview"
 * of what the account balance is after all promos are applied.
 *
 * NOTE: Requires `payments` field to be populated on self.
 *
 * !!!!!! NOTE ON SIGNS: !!!!!!
 * Due to how signs on Payments (see docstring for Payments Model) are handled:
 * - A POSITIVE balance means that money is OWED to Cliques
 * - A NEGATIVE balance means that the ORGANIZATION is OWED money from Cliques.
 */
organizationSchema.virtual('accountBalance')
    .get(function(){
        var self = this;
        // check if value has been set temporarily, just return it if so
        if (self._tmpBalance) return self._tmpBalance;

        // Otherwise, go through the summation
        // first total up all outstanding (i.e. Pending or Overdue) payments
        var total = this.getOutstandingPaymentTotals();

        // add promos as well
        // NOTE: this doesn't actually touch the promoAmount or active property
        if (self.promos){
            var filtered_promos = self.promos.filter(function(p){
                return p.active;
            });
            total += _.sumBy(filtered_promos, 'promoAmount');
        }
        return total;
    })
    // setter to allow for temporary manipulation of balance for display purposes
    .set(function(tmpBalance){
        this._tmpBalance = tmpBalance;
    });

/**
 * Just a shim.  Have organiztion_types as an array currently, but need
 * easy access to single type for some purposes.
 */
organizationSchema.virtual('effectiveOrgType').get(function(){
    return this.organization_types[0];
});

/**
 * Virtual property for fully-qualified (i.e. w/ http prefix) URI for org website, if
 * it's not entered as a fully-qualified URI already.
 */
organizationSchema.virtual('URI').get(function(){
    var protocol_substring = 'http';
    if (this.website){
        if (this.website.substr(0, protocol_substring.length) !== protocol_substring){
            return protocol_substring + '://' + this.website;
        }
    }
    return this.website;
});

/**
 * Convenience method mapping org fields to Quickbooks Vendor object
 *
 * Designed for QBO API v3
 * @returns {{}}
 */
organizationSchema.methods.toQuickbooksVendor = function(){
    var self = this;
    return {
        "BillAddr": {
            "Line1": self.address,
            "Line2": self.address2,
            "City": self.city,
            "Country": self.country,
            "CountrySubDivisionCode": self.state,
            "PostalCode": self.zip
        },
        "AcctNum": self._id,
        "CompanyName": self.name,
        "DisplayName": self.name,
        "PrintOnCheckName": self.name,
        "PrimaryEmailAddr": {
            "Address": self.owner.email
        },
        "WebAddr": {
            "URI": self.URI
        },
        "PrimaryPhone": {
            "FreeFormNumber": self.phone
        }
    };
};

/**
 * Synchronous function to get all outstanding payments for an Organization
 *
 * Totals up all "Pending" or "Overdue" payments, and applies all active promos,
 * updating promo totals & deactivating promos as applicable.
 */
organizationSchema.methods.getOutstandingPayments = function(){
    if (this.payments){
        return this.payments.filter(function(p){
            return p.status === 'Pending' || p.status === 'Overdue';
        });
    }
};

organizationSchema.methods.getOutstandingPaymentTotals = function(){
    var total = 0;
    var payments = this.getOutstandingPayments();
    if (payments){
        total += _.sumBy(payments, 'totalAmount');
    }
    return total;
};

/**
 * Waterfalls down promos on organization and applies each to a given total.
 *
 * Deducts amount applied from promo.promoAmount, and sets promo.active to false if promo is
 * completely used up.
 *
 * NOTE: Does NOT re-save org after modifying promos used, that's up to you to do.
 *
 * TODO: All of this promo logic assumes that Advertiser/Publisher promos have negative/positive promoAmounts,
 * TODO: which is logical but not enforced in any way.  So if an advertiser/publisher promo is positive/negative,
 * TODO: the results of this waterfall will be all fucked up.
 *
 * Returns object { total: <new total>, applied_promos: [<array of promos that were used>] }
 *
 * Promo objects in applied_promos array include `amountUsed` property which contains the precise amount
 * of that promo that was applied to the total.
 *
 * @param total
 * @returns { total: <new total after promos>, applied_promos: [<array of promo objects that were applied>] }
 */
organizationSchema.methods.applyPromosToTotal = function(total){
    var self = this;
    var applied_promos = [];
    if (self.promos){
        var filtered_promos = self.promos.filter(function(p){
            return p.active;
        });
        filtered_promos.forEach(function(promo){
            // handle advertiser & publisher promos differently, since you can technically use "part" of a promo
            // when you're an advertiser, but not as a publisher
            switch (self.effectiveOrgType) {
                case 'advertiser':
                    // TODO: Handle "percentage" promos here -- i.e. promos w/ % and minimum spend levels
                    // waterfall down the promos, add each from total
                    // set active to false if promo is all used up
                    if (total) {
                        // deactivate & clear promoAmount if promo total is less
                        // than total of payments due.
                        if (Math.abs(total) >= Math.abs(promo.promoAmount)){
                            total += promo.promoAmount;
                            promo.promoAmount = 0;
                            promo.active = false;
                            // now append to applied_promos array for reference
                            promo.amountUsed = promo.promoAmount; // this is a fake property, only used by caller methods
                            applied_promos.push(promo);
                            // otherwise, just deduct total from promoAmount, zero out total
                            // but keep promo active for use next time.
                        } else {
                            promo.promoAmount = promo.promoAmount + total;
                            promo.amountUsed = total;
                            // zero out total, since promo amount is greater
                            total = 0;
                            // now append to applied_promos array for reference
                            applied_promos.push(promo);
                        }
                    }
                    break;
                case 'publisher':
                    filtered_promos.forEach(function(promo){
                        total += promo.promoAmount;
                        promo.active = false;
                        promo.amountUsed = promo.promoAmount;
                        applied_promos.push(promo);
                    });
                    break;
            }
        });
    }
    return { total: total, applied_promos: applied_promos };
};

/**
 * Central method to handle logic around billingEmail settings, returning
 * single array of all emails to send billing emails to
 *
 * @returns {Array}
 */
organizationSchema.methods.getAllBillingEmails = function(){
    var billingEmails = [];
    if (!_.isNil(this.billingEmails)) {
        if (this.billingEmails.length > 0) {
            billingEmails = this.billingEmails;
        }
    }
    if (this.sendStatementToOwner) {
        billingEmails.push(this.owner.email);
    }
    return billingEmails;
};

exports.Organization = mongoose.model('Organization', organizationSchema);
