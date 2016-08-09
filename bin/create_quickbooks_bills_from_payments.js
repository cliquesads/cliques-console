
var _ = require('lodash'),
    inquirer = require('inquirer'),
    Promise = require('promise'),
    util = require('util'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    moment = require('moment'),
    QuickBooks = require('node-quickbooks');

require('./_main')(function(GLOBALS){
    var config = GLOBALS.cliques_config,
        mongoose = GLOBALS.mongoose,
        users = require('../app/models/user.server.model'),
        Organization = mongoose.model('Organization'),
        Payment = mongoose.model('Payment'),
        QBO_ACCOUNT_IDS = require('../app/models/billing.server.model').QBO_ACCOUNT_IDS;

    // Get Quickbooks API user oauth token
    // TODO: Go through proper OAuth flow here to issue new token if needed
    var QUICKBOOKS_OAUTH_PATH = path.join(process.env['HOME'], 'quickbooks_oauth_access_token.json');
    var accessToken = JSON.parse(fs.readFileSync(QUICKBOOKS_OAUTH_PATH, 'utf8'));
    // check if token is going to expire
    var expiration = moment(accessToken.expires);
    var now = moment();
    var expires_days = moment.duration(expiration - now).as('days');

    // Warn user if token is going to / has expired
    if (expires_days < 30){
        var renewal_instructions = "To renew your Quickbooks OAuth token, run the node-quickbooks sample app and follow " +
            "the OAuth flow steps. To read the full OAuth instructions, go here: " +
            "https://developer.intuit.com/docs/0100_accounting/0060_authentication_and_authorization/connect_from_within_your_app#/manage";
        // exit process if Oauth Token has expired
        if (expires_days <= 0){
            console.error("ERROR: your QuickBooks OAuth access token has expired.");
            console.error(renewal_instructions);
            return process.exit(1);
        } else {
            console.warn("WARNING: your Quickbooks OAuth access token is set to expire in " +
                expires_days.toFixed(0) + " days.");
            console.warn(renewal_instructions);
        }
    }

    // Now we can instantiate the QB client
    var qbo = new QuickBooks(
        config.get('QuickBooks.oauth_consumer_key'),
        config.get('QuickBooks.oauth_consumer_secret'),
        accessToken.oauth_token,
        accessToken.oauth_token_secret,
        config.get('QuickBooks.realmId'),
        true,
        true
    );

    /**
     * Creates a QBO "Bill" from outstanding payments (either "Pending" or "Overdue") and saved Org & Payments,
     * updating where necessary (to set status to paid, set qboVendorId, etc.)
     *
     * @param org
     * @param callback
     */
    var getPaymentsAndCreateBills = function(org, callback){

        // subfunction to actually create bill
        function _createBill(vendorId, callback){
            var bill = {
                "VendorRef": {
                    "value": vendorId
                }
            };
            var lines = [];
            var payments = org.getOutstandingPayments();
            var promosObj = org.applyPromosToTotal();

            // first create lines for each LineItem in each payment
            payments.forEach(function(payment){
                lines = lines.concat(payment.getQboBillLines());
            });

            // Now create promos lines
            if (promosObj.applied_promos && promosObj.applied_promos.length > 0){
                promosObj.applied_promos.forEach(function(promo){
                    lines.push({
                        "Description": promo.description,
                        "Amount": promo.amountUsed,
                        "DetailType": "AccountBasedExpenseLineDetail",
                        "AccountBasedExpenseLineDetail": {
                            "AccountRef": QBO_ACCOUNT_IDS["publisher_promo"]
                        }
                    });
                });
            }
            bill["Line"] = lines;

            // handles steps following creation of bill: save org & save payments
            function _qboCallback(err, bill){
                if (err) return console.error(err);
                console.info('The following bill was created for  ' + org.name + ': ' + bill.Id);
                // save all payments, setting each to "Paid"
                async.each(payments, function(payment, cb){
                    payment.status = 'Paid';
                    payment.save(cb);
                }, function(err){
                    if (err) console.error(err);
                    // save org to lock-in promo statuses & balances
                    org.save(function(e, org){
                        if (e) return callback(e);
                        return callback(null, bill);
                    });
                });
            }

            // Finally, create the actual bill and callback
            if (process.env.NODE_ENV === 'production'){
                qbo.createBill(bill, _qboCallback);
            } else {
                _qboCallback(null, { Id: "!!Fake bill!!"})
            }

        }

        // Wrap in outer statement that creates vendor if one does not already exist for this org
        if (_.isNil(org.qboVendorId)){
            qbo.createVendor(org.toQuickbooksVendor(), function(err, vendor){
                if (err) return callback(err);
                org.qboVendorId = vendor.Id;
                _createBill(vendor.Id, callback);
            });
        } else {
            _createBill(org.qboVendorId, callback)
        }
    };

    Organization.find({
        payments: {$ne: null },
        billingPreference: "Check",
        organization_types: "publisher"
    }).populate('payments owner').exec(function(err, orgs){
        if (err){
            console.error(err);
            return process.exit(1);
        }
        // exit if no orgs returned in query or there aren't any payments to process
        if (orgs){
            // filter down to those w/ negative account balances & those that are definitely pubs
            orgs = orgs.filter(function(org){
                return org.accountBalance < 0 && org.effectiveOrgType === 'publisher'
            });
            if (orgs.length === 0){
                console.info('No payments to process, exiting...');
                return process.exit(0);
            }
        } else {
            console.info('No payments to process, exiting...');
            return process.exit(0);
        }

        // construct preview string
        // now prep a unicode table preview of all org payment info for user prompt
        var results_str = orgs.map(function(org){
            return org.name + '\t$' + org.accountBalance.toFixed(2);
        });
        results_str = results_str.join('\n');
        // only really processing payments in production, so let the user know
        if (process.env.NODE_ENV != 'production'){
            results_str += '\n (not really, you\'re not running with env=production so no ' +
                'bills will be created)';
        }

        inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'The following bills will be created in Quickbooks: \n' + results_str,
            default: false
        }]).then(function(answers){
            if (answers['confirm']) {
                async.each(orgs, getPaymentsAndCreateBills, function(err){
                    if (err){
                        console.error(err);
                        return process.exit(1);
                    }
                    console.info("Done!");
                    return process.exit(0);
                });
            }
        });

    });
});
