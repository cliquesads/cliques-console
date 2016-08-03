/**
 * Creates charges to all cards for Organizations with outstanding balances.
 */

//TODO: Add promo.active flags to all existing documents

var _ = require('lodash'),
    inquirer = require('inquirer'),
    Promise = require('promise'),
    util = require('util'),
    async = require('async');

require('./_main')(function(GLOBALS){
    var config = GLOBALS.cliques_config,
        mongoose = GLOBALS.mongoose;

    var users = require('../app/models/user.server.model.js'),
        Organization = mongoose.model('Organization'),
        Payment = mongoose.model('Payment');

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
            var payments = org.getOutstandingPayments();
            var total = org.getOutstandingPaymentTotals();
            // this will deduct any promos from total, but also handle post-application tasks like
            // deducting amount used and deactivating as necessary
            total = org.applyPromosToTotal(total);
            return callback(null, {
                total: total,
                org: org,
                payments: payments
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

        if (process.env.NODE_ENV === 'production'){
            var promise = stripe.charges.create({
                amount: Math.round(res.total*100), // all charges performed in lower currency unit, i.e. cents
                currency: "usd",
                customer: res.org.stripeCustomerId,
                description: "Cliques Advertiser Payments for " + res.org.name,
                receipt_email: billingEmails[0]
            });
        } else {
            // empty promise for testing
            promise = new Promise(function(resolve){ return resolve({ id: '!!fake charge!!'}); });
        }

        // After promise is done, perform org & payment saving tasks
        promise.then(function(charge){
            console.info('The following charge was processed for ' + res.org.name + ': ' + charge.id);
            // if charge was successful, update payment statuses and save
            async.each(res.payments, function(payment, cb){
                payment.status = 'Paid';
                payment.save(cb);
            }, function(err){
                if (err) console.error(err);
                // save org to lock-in promo statuses & balances
                res.org.save(function(e, org){
                    if (e) return callback(e);
                    return callback(null, charge);
                });
            });
        }, function(err){
            // Don't actually callback with error here because I want to process all charges,
            // and calling back w/ error would cause series to stop.
            var msg = util.format("ERROR while processing charge for %s: %s (requestId %s, statusCode %s)",
                res.org.name, err.message, err.requestId, err.statusCode);
            console.error(msg);
            callback();
        });
    };

    /**
     * Now do the thing
     */
    Organization.find({ payments: {$ne: null }}).populate('payments').exec(function(err, orgs){
        // get payment info (mainly total to charge and effected payments & promos) for all orgs
        async.mapSeries(orgs, getSingleOrgPaymentInfo, function(err, results){
            if (err) {
                console.error(err);
                return process.exit(1);
            } else {
                // filter out null results first, i.e. orgs without any payments to process
                results = results.filter(function(res){ return !_.isNull(res)});

                // exit if no payments are found
                if (results.length === 0){
                    console.info('No payments to process, exiting...');
                    return process.exit(0);
                }

                // now prep a unicode table preview of all org payment info for user prompt
                var results_str = results.map(function(res){
                    return res.org.name + '\t$' + res.total.toFixed(2);
                });
                results_str = results_str.join('\n');

                if (process.env.NODE_ENV != 'production'){
                    results_str += '\n (not really, you\'re not running with env=production so no ' +
                        'charges will be processed)';
                }

                // now prompt user with preview and make them confirm to actually process payments
                var confirm = inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: 'The following payments will be processed: \n' + results_str,
                    default: false
                }]).then(function(answers){
                    if (answers['confirm']){
                        async.mapSeries(results, chargeStripeAccountAndSave, function(err, results){
                            if (err) {
                                console.error(err);
                                return process.exit(1);
                            }
                            console.info('Success! All orgs and payments updated.');
                            return process.exit(0);
                        });
                    } else {
                        console.info('kthxbai!');
                        process.exit(0);
                    }
                });
            }
        });
    });
}, [[
    ['-t', '--type'],
    {
        help: 'Type of org to run payments for, either \'advertiser\' or \'publisher\''
    }
]]);