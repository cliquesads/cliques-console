
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
        users = require('../app/models/user.server.model.js'),
        Organization = mongoose.model('Organization'),
        Payment = mongoose.model('Payment');

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

    var ACCOUNT_IDS = {
        "cpm_impressions_expense": "68",
        "publisher_rev_share": "75"
    };

    qbo.findAccounts({
        "name": 'Publisher Revenue Share'
    }, function(err, accounts) {
        console.log(accounts.QueryResponse);
    });
});
