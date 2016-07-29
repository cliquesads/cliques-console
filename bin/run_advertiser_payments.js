/**
 * Creates charges to all cards for Organizations with outstanding balances.
 */

//TODO: Add promo.active flags to all existing documents
//TODO: Also add endpoint to billing controller that switches payment to 'Paid', since all applicable promos will need
//TODO: be toggled to 'paid' when invoice is paid manually

var _ = require('lodash'),
    mongoose = require('mongoose'),
    Organization = mongoose.model('Organization'),
    Payment = mongoose.model('Payment'),
    config = require('config'),
    async = require('async');

var stripe = require('stripe')(config.get("Stripe.secret_key"));


/**
 * Inner function that calculates total payment amount due and processes it with Stripe for orgs w/ positive
 * balance and billingPreference set to "Stripe"
 *
 * @param org
 * @param callback
 * @private
 */
var getSingleOrgPaymentInfo = function(org, callback){
    if (org.billingPreference === 'Stripe' && org.accountBalance > 0){
        var total = org.getOutstandingPaymentTotals();
        // this will deduct any promos from total, but also handle post-application tasks like
        // deducting amount used and deactivating as necessary
        total = org.applyPromosToTotal(total);
        return callback(null, {
            total: total,
            org: org
        });
    } else {
        return callback(null, null);
    }
};

/**
 * Wrapper to run payments for all orgs
 */
var runAllPayments = function(){
    Organization.populate('payments')
        .find({ payments: {$ne: null }})
        .exec(function(err, orgs){
            async.mapSeries(orgs, getSingleOrgPaymentInfo, function(err, results){
                if (err) {
                    console.error(err);
                    return process.exit(1);
                } else {
                    
                }

            });
        });
};