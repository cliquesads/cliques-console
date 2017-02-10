'use strict';
var errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    mail = require('./mailer.server.controller'),
    util = require('util'),
    config = require('config'),
    countryDataLookup = require('country-data').lookup,
    async = require('async');

var mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });
var stripe = require('stripe')(config.get("Stripe.secret_key"));

var buildInviteURL = function(req, organizationId, accessTokenId){
    var protocol = 'https';
    if (process.env.NODE_ENV === 'local-test'){
        protocol = 'http';
    }
    var hostname = req.headers.host;
    var base = util.format("%s://%s", protocol, hostname);
    return util.format("%s/#!/invite/organization/%s/%s", base, organizationId, accessTokenId);
};

/**
 * TODO: This is fucking horrible.
 *
 * TODO: Reason this exists at all is because the client-side form library being used to populate 'country' field
 * TODO: on signup (angular-country-state-select > https://github.com/nerfe/angularjs-country-state-select)
 * TODO: inexplicably uses de-normalized country NAMES (NAMES!!!!!!!!) for country values.
 *
 * TODO: Stripe (and really anyone with a brain) needs the ISO 3166-1 alpha 2 country code. Changing the angular
 * TODO: library would be extremely annoying because there currently aren't any other libs that also contain detailed
 * TODO: region mappings, which is extremely helpful.  So I'm forced to hack together this mapping.
 * 
 * "Countries" (i.e. possible country values generated by angular-country-state-select) that this will fail for are:
 *      Ashmore and Cartier Island, Europa Island, Gaza Strip, Glorioso Islands, Howland Island, Jarvis Island,
 *      Johnston Atoll, Laos, Spratly Islands, West Bank
 */
var lookupCountryCode = function(countryName){
    // I did this manually by generating all failed lookup country values, then manually looking up their ISO codes
    // The values with no codes are documented above
    var mapping = {"Antartica":"AQ","Antigua and Barbuda":"AG","Bolivia":"BO","Bosnia and Herzegovina":"BA","British Virgin Islands":"VG","Brunei":"BN","Cape Verde":"CV","Congo, Democratic Republic of the":"CD","Congo, Republic of the":"CG","Cote d'Ivoire":"CI","Czeck Republic":"CZ","Falkland Islands (Islas Malvinas)":"FK","French Southern and Antarctic Lands":"TF","Gambia, The":"GM","Guinea-Bissau":"GW","Heard Island and McDonald Islands":"HM", "Holy See (Vatican City)":"VA","Iran":"IR","Ireland, Northern":"GB","Jan Mayen":"SJ","Korea, North":"KP","Korea, South":"KR","Macau":"MO", "Macedonia, Former Yugoslav Republic of":"MK","Man, Isle of":"IM","Micronesia, Federated States of":"FM","Pitcaim Islands":"PN", "Romainia":"RO","Russia":"RU", "Saint Helena":"SH","Saint Kitts and Nevis":"KN","Saint Pierre and Miquelon":"PM","Saint Vincent and the Grenadines":"VC","Scotland":"GB", "South Georgia and South Sandwich Islands":"GS","Svalbard":"SJ","Syria":"SY","Tanzania":"TZ","Tobago":"TT","Toga":"TG","Trinidad":"TT", "USA":"US","Venezuela":"VE","Vietnam":"VN","Virgin Islands":"VI","Wales":"GB","Wallis and Futuna":"WF"};

    // first try countryData
    var lookupVals = countryDataLookup.countries({ name: countryName });
    if (lookupVals.length === 0){
        // if lookup fails, go to mapping
        // if that fails just return countryName
        return mapping[countryName] || countryName;
    } else {
        return lookupVals[0];
    }
};

module.exports = {

    /**
     * Get a single organization
     */
    read: function (req, res) {
        res.json(req.organization);
    },

    /**
     * Organization middleware
     */
    organizationByID: function (req, res, next, id) {
        Organization.findById(id).populate('users owner payments').exec(function (err, organization){
            if (err) return next(err);
            if (!organization) return next(new Error('Failed to load organization ' + id));
            req.organization = organization;
            next();
        });
    },

    /**
     * Create a new organization
     */
    create: function(req, res) {
        var organization = new Organization(req.body);
        organization.save(function (err, org) {
            if (err) return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(err)
            });
            // now check for access code issuer.
            // If present, issue their promo & send them an email
            if (org.accesscode){
                AccessCode.findById(org.accesscode, function(err, accessCode){
                    if (err) console.error('ERROR occurred when populating accesscode field for org: ' + err);
                    // populate issuer orgs, if any
                    var promoType = 'Signup';
                    accessCode.redeemIssuerPromos(promoType,function(err, results){
                        if (err) console.error(err);
                        // results is array of { user: <User>, promo: <Promo> } objects
                        if (process.env.NODE_ENV === 'production'){
                            results.forEach(function(userPromo){
                                var subject = util.format('%s Has Redeemed Your Cliques Access Code.',
                                    organization.name);
                                if (userPromo.promo) subject = 'You\'ve Got Cash - ' + subject;
                                mailer.sendMail({
                                    subject: subject,
                                    templateName: 'accesscode-redeemed-email.server.view.html',
                                    data: { organization: org, promo: userPromo.promo, accessCode: accessCode, promoType: promoType },
                                    to: userPromo.user.email,
                                    fromAlias: 'Cliques'
                                });
                            });
                        }
                    });
                });
            }
            // this will likely execute & send response before accesscode promo step has completed,
            // but this is by design, don't want to error out or wait for that step to finish.
            return res.json(org);
        });
    },

    /**
     * Update organization model
     * @param req
     * @param res
     */
    update: function(req, res) {
        var organization = req.organization;
        organization = _.extend(organization, req.body);
        organization.tstamp = Date.now();
        organization.save(function (err, org) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.status(200).json(org).send();
            }
        });
    },

    /**
     * Delete an organization
     */
    remove: function (req, res) {
        var organization  = req.organization;
        organization.remove(function (err) {
            if (err) {
                console.log(err);
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.json(organization);
            }
        });
    },

    /**
     * Authorization middleware -- checks if user has permissions to
     * access organization
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    hasAuthorization: function (req, res, next) {
        var user = _.find(req.organization.users, function(u){ return u.id === req.user.id; });
        if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
            if (!user) {
                return res.status(403).send({
                    message: 'User is not authorized to access this organization'
                });
            }
        }
        next();

    },

    /**
     * Returns middleware function to check whether user's organization
     * has correct types necessary to access endpdoint.  Same idea as users.hasAuthorization
     *
     * @param orgTypes
     * @returns {Function}
     */
    organizationHasAuthorization: function(orgTypes){
        return function(req, res, next) {
            if (_.intersection(req.user.organization.organization_types, orgTypes).length) {
                return next();
            } else {
                return res.status(403).send({
                    message: 'Organization is not authorized'
                });
            }
        };
    },

    sendUserInvite: function(req, res){
        var organization = req.organization;

        // manually create token and store in ObjectId so you don't have to look
        // it up later after saving Organization when generating link
        var tokens = [];
        req.body.forEach(function(newUser){
            var token = mongoose.Types.ObjectId();
            tokens.push(token);
            organization.accessTokens.push({
                _id: token,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email
            });
        });

        // TODO: Debatable whether this needs to be a serial process.
        // TODO: Could just save the org and independently send the email, but probably
        // TODO: worth it to keep it serial just to catch any errors saving the Organization
        organization.save(function(err, org){
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                var subject = util.format("%s Has Invited You To Join Cliques",
                    req.user.displayName);
                var asyncFuncs = [];
                var fu = function(thisToken, thisUser){
                    return function(callback){
                        var inviteUrl = buildInviteURL(req, organization._id, thisToken);
                        mailer.sendMailFromUser(subject, 'invite-user-in-org-email.server.view.html',
                            { user: req.user, inviteUrl: inviteUrl, organization: organization },
                            req.user,
                            thisUser.email,
                            callback
                        );
                    };
                };
                for (var i=0; i < req.body.length; i++){
                    var token = tokens[i];
                    var newUser = req.body[i];
                    var func = fu(token, newUser);
                    asyncFuncs.push(func);
                }
                async.parallel(asyncFuncs, function(err, results){
                    if (err){
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        return res.status(200).send();
                    }
                });
            }
        });
    },

    stripeAccount: {
        saveToken: function(req, res){
            var organization = req.organization;
            // Get the credit card details submitted by the form
            var stripeToken = req.query.stripeToken;
            // pass in account type collected in stripe form
            var accountType = req.query.accountType;

            // assumes dob in 'MM/DD/YYYY' form
            var dob;
            if (req.query.dob){
                dob = req.query.dob.split("/");
            } else {
                dob = [null, null, null];
            }

            if (!stripeToken){
                return res.status(404).send({
                    message: "You must provide a stripeToken to save using stripeToken query param"
                });
            }

            var stripeErrorHandler = function(error){
                console.error(error);
                return res.status(402).send({
                    message: error.toString()
                });
            };

            // create new Stripe Account object if there isn't already one tied
            // to this organization
            if (_.isNil(organization.stripeAccountId)){
                var countryCode = lookupCountryCode(organization.country);
                stripe.accounts.create({
                    managed: true,
                    country: countryCode,
                    email: organization.owner.email,
                    business_name: organization.name,
                    business_url: organization.website,
                    external_account: stripeToken,
                    legal_entity: {
                        address: {
                            city: organization.city,
                            country: countryCode,
                            line1: organization.address,
                            line2: organization.address2,
                            state: organization.state,
                            postal_code: organization.zip
                        },
                        business_name: organization.name, // this isn't necessarily legal name, but whatever
                        first_name: organization.owner.firstName,
                        last_name: organization.owner.lastName,
                        type: accountType,
                        dob: {
                            month: parseInt(dob[0]),
                            day: parseInt(dob[1]),
                            year: parseInt(dob[2])
                        }
                    },
                    product_description: "Digital Advertising Impressions",
                    tos_acceptance: {
                        date: Math.floor(Date.now() / 1000),
                        ip: req.ip
                    }
                }).then(function(account) {
                    organization.stripeAccountId = account.id;
                    organization.save(function(err, org){
                        if (err){
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.status(200).json(org).send();
                    });
                }, stripeErrorHandler);
            } else {
                // just update existing Customer with new source
                stripe.accounts.update(organization.stripeAccountId, {
                    external_account: stripeToken
                }).then(function(account){
                    // TODO: Should probably respond w/ card object instead?
                    res.status(200).json(organization).send();
                }, stripeErrorHandler);
            }
        },
        getAccount: function(req, res){
            var organization = req.organization;
            if (_.isNil(organization.stripeAccountId)){
                return res.status(404).send({
                    message: "Organization does not have an associated Stripe Account ID"
                });
            }
            stripe.accounts.retrieve(organization.stripeAccountId, function(err, account){
                if (err) return res.status(400).send(err);
                res.status(200).json(account);
            });
        }
    },

    stripeCustomer: {
        /**
         * Saves Stripe token as a payment "source" to this Organization's Stripe Customer object.
         *
         * If Organization doesn't yet have a CustomerID, will create new Customer, then save the token.
         *
         * If Organization DOES have CustomerID, saves new token to existing Customer.
         *
         * In either case, if successful, responds w/ Organization object
         * @param req
         * @param res
         * @returns {*}
         */
        saveToken: function(req, res){
            // Get the credit card details submitted by the form
            var stripeToken = req.query.stripeToken;
            var organization = req.organization;

            if (!stripeToken){
                return res.status(404).send({
                    message: "You must provide a stripeToken to save using stripeToken query param"
                });
            }

            var stripeErrorHandler = function(error){
                console.log(error);
                return res.status(402).send({
                    message: error.toString()
                });
            };

            // create new Stripe Customer object if there isn't already one tied
            // to this organization
            if (_.isNil(organization.stripeCustomerId)){
                stripe.customers.create({
                    source: stripeToken,
                    description: organization.name,
                    email: organization.owner.email,
                    metadata: {
                        organization_id: organization._id.toString(),
                        organization_type: organization.organization_types.join(',')
                    },
                    account_balance: organization.account_balance
                }).then(function(customer) {
                    organization.stripeCustomerId = customer.id;
                    organization.save(function(err, org){
                        if (err){
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.status(200).json(org).send();
                    });
                }, stripeErrorHandler);
            } else {
                // just update existing Customer with new source
                stripe.customers.createSource(organization.stripeCustomerId, {
                    source: stripeToken
                }).then(function(card) {
                    // now make new source the default_source for this customer
                    return stripe.customers.update(organization.stripeCustomerId, {
                        default_source: card.id
                    });
                }).then(function(customer){
                    // TODO: Should probably respond w/ card object instead?
                    res.status(200).json(organization).send();
                }, stripeErrorHandler);
            }
        },

        /**
         * Gets Organization's Stripe customer data (like saved cards, etc.)
         */
        getCustomer: function(req, res){
            var organization = req.organization;
            if (_.isNil(organization.stripeCustomerId)){
                return res.status(404).send({
                    message: "Organization does not have an associated Stripe Customer ID"
                });
            }
            stripe.customers.retrieve(organization.stripeCustomerId, function(err, customer){
                if (err) return res.status(400).send(err);
                res.status(200).json(customer);
            });
        }
    }
};