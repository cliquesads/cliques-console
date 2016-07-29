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
    inquirer = require('inquirer'),
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
 * Charges org's Stripe account for given total.
 *
 * @param res
 * @param callback
 */
var chargeStripeAccountAndSave = function(res, callback){
    var billingEmails = res.org.getAllBillingEmails();
    stripe.charges.create({
        amount: res.total,
        currency: "usd",
        customer: res.org.stripeCustomerId,
        description: "Cliques Advertiser Payments for " + res.org.name,
        receipt_email: billingEmails[0]
    }, function(err, charge){
        if (err) return callback(err);
        // if charge was successful, save org to lock-in promo statuses & balances
        res.org.save(function(e, org){
            if (e) return callback(e);
            return callback(null, charge);
        });
    });
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
                    // filter out null results first, i.e. orgs without any payments to process
                    results = results.filter(function(res){ return !_.isNull(res)});

                    // now prep a unicode table preview of all org payment info for user prompt
                    var results_str = results.map(function(res){
                        return res.org.name + '\t$' + res.total.toFixed(2);
                    });
                    results_str = results_str.join('\n');

                    // now prompt user with preview and make them confirm to actually process payments
                    var confirm = inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: 'The following payments will be processed: \n' + results_str,
                        default: false
                    }]).then(function(answers){
                        if (answers['confirm']){
                            async.mapSeries(results, chargeStripeAccount, function(err, results){
                                if (err) {
                                    console.error(err);
                                    return process.exit(1);
                                }
                                console.info(results);
                                return process.exit(0);
                            });
                        }
                    });
                }
            });
        });
};