/**
 * Creates charges to all cards for Organizations with outstanding balances.
 */

//TODO: Add promo.active flags to all existing documents

const _ = require('lodash'),
    inquirer = require('inquirer'),
    async = require('async');

require('./_main')(GLOBALS => {
    const config = GLOBALS.cliques_config,
        // pick up custom command line arg (expect either "publisher" or "advertiser"
        paymentsType = GLOBALS.args.type,
        force = GLOBALS.args.force;

    const Organization = require('../app/models/organization.server.model').Organization;

    const stripe = require('stripe')(config.get("Stripe.secret_key"));

    /**
     * Inner function that calculates total payment amount due and processes it with Stripe for orgs w/ outstanding
     * balance (positive if advertiser, negative if publisher) and billingPreference set to "Stripe"
     *
     * @param org
     * @param callback
     * @private
     */
    const getSingleOrgPaymentInfo = (org, callback) => {
        // first check if orgType matches this paymentsType, and if org billing preference is in fact Stripe
        if (org.effectiveOrgType === paymentsType && org.billingPreference === 'Stripe'){

            // now that that's clear, check that account balance is nonzero.
            // For advertisers, this means balance > 0; for publishers, this means < 0.
            // I know I know, why can't we just check if balance is === 0?? Cause if org has some promos
            // that haven't been completely used up, org balance will be less than zero, and it doesn't
            // make sense to pay out negative balance to advertisers.  For publishers, if account has
            // promos, the balance will be negative, and we do actually want to pay that out.
            let valid = org.effectiveOrgType === 'advertiser' && org.accountBalance > 0;
            valid = valid || org.effectiveOrgType === 'publisher' && org.accountBalance < 0;
            valid = valid || org.effectiveOrgType === 'networkAdmin' && org.accountBalance !== 0;
            if (valid){
                const payments = org.getOutstandingPayments();
                let total = org.getOutstandingPaymentTotals();
                // this will deduct any promos from total, but also handle post-application tasks like
                // deducting amount used and deactivating as necessary
                total = org.applyPromosToTotal(total).total;
                return callback(null, {
                    total: total,
                    org: org,
                    payments: payments
                });
            }
        }
        return callback(null, null);
    };

    /**
     * Charges org's Stripe account for given total.
     *
     * @param res
     * @param callback
     */
    const makeStripePaymentAndSave = (res, callback) => {
        const billingEmails = res.org.getAllBillingEmails();

        const _createChargePromise = () => stripe.charges.create({
            amount: Math.round(res.total*100), // all charges performed in lower currency unit, i.e. cents
            currency: "usd",
            customer: res.org.stripeCustomerId,
            description: `Cliques Advertiser Payment for ${res.org.name}`,
            receipt_email: billingEmails[0]
        });

        const _createTransferPromise = () => stripe.transfers.create({
            amount: -1 * Math.round(res.total*100),
            currency: "usd",
            destination: res.org.stripeAccountId,
            description: `Cliques Publisher Payment for ${res.org.name}`
        });

        let promise;
        if (process.env.NODE_ENV === 'production'){
            switch (paymentsType){
                case "advertiser":
                    promise = _createChargePromise();
                    break;
                case "publisher":
                    promise = _createTransferPromise();
                    break;
                case "networkAdmin":
                    // figure out whether to run as Charge or as a Transfer
                    // depending on balance sign
                    if (res.total > 0){
                        promise = _createChargePromise();
                    } else {
                        // filtered in previous step so that won't be run if balance is 0
                        promise = _createTransferPromise();
                    }
                    break;
            }
        } else {
            // empty promise for testing
            promise = new Promise(resolve => resolve({ id: '!!fake charge!!'}));
        }

        // After promise is done, perform org & payment saving tasks
        promise.then(charge => {
            console.info(`The following charge was processed for ${res.org.name}: ${charge.id}`);
            // if charge was successful, update payment statuses and save
            async.each(res.payments, (payment, cb) => {
                payment.status = 'Paid';
                payment.save(cb);
            }, err => {
                if (err) console.error(err);
                // save org to lock-in promo statuses & balances
                res.org.save((e, org) => {
                    if (e) return callback(e);
                    return callback(null, charge);
                });
            });
        }, err => {
            // Don't actually callback with error here because I want to process all charges,
            // and calling back w/ error would cause series to stop.
            const msg = `ERROR while processing charge for ${res.org.name}: ${err.message} (requestId ${err.requestId}, 
                statusCode ${err.statusCode})`;
            console.error(msg);
            callback();
        });
    };

    /**
     * Now do the thing
     */
    Organization.find({ payments: {$ne: null }}).populate('payments').exec((err, orgs) => {
        // get payment info (mainly total to charge and effected payments & promos) for all orgs
        async.mapSeries(orgs, getSingleOrgPaymentInfo, (err, results) => {
            if (err) {
                console.error(err);
                return process.exit(1);
            } else {
                // filter out null results first, i.e. orgs without any payments to process
                results = results.filter(res => !_.isNull(res));

                // exit if no payments are found
                if (results.length === 0){
                    console.info('No payments to process, exiting...');
                    return process.exit(0);
                }

                // now prep a unicode table preview of all org payment info for user prompt
                let results_str = results.map(res => `${res.org.name}\t$${res.total.toFixed(2)}`);
                results_str = results_str.join('\n');
                // only really processing payments in production, so let the user know
                if (process.env.NODE_ENV !== 'production'){
                    results_str += '\n (not really, you\'re not running with env=production so no ' +
                        'charges will be processed)';
                }

                const callback = () => async.mapSeries(results, makeStripePaymentAndSave, (err, results) => {
                    if (err) {
                        console.error(err);
                        return process.exit(1);
                    }
                    console.info('Success! All orgs and payments updated.');
                    return process.exit(0);
                });

                if (force){
                    `The following payments will be processed: \n${results_str}`;
                    callback();
                } else {
                    // now prompt user with preview and make them confirm to actually process payments
                    inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: `The following payments will be processed: \n${results_str}`,
                        default: false
                    }]).then(answers => {
                        if (answers.confirm){
                            callback();
                        } else {
                            console.info('kthxbai!');
                            process.exit(0);
                        }
                    });
                }

            }
        });
    });
}, [[
    ['-t', '--type'],
    {
        help: 'Type of org to run payments for, either \'advertiser\', \'publisher\' or \'networkAdmin\''
    }
],[
    ['-f', '--force'],
    {
        action: 'storeTrue',
        help: 'Force -- skips confirmation step.'
    }
]]);