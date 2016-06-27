var errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    mail = require('./mailer.server.controller'),
    util = require('util'),
    config = require('config'),
    async = require('async');

var mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });
var stripe = require('stripe')(config.get("Stripe.secret_key"));

var buildInviteURL = function(organizationId, accessTokenId){
    var protocol = 'https';
    if (process.env.NODE_ENV === 'local-test'){
        protocol = 'http';
    }
    var hostname = config.get(util.format("Console.%s.external.hostname", protocol));
    var base = util.format("%s://%s", protocol, hostname);
    return util.format("%s/#!/invite/organization/%s/%s", base, organizationId, accessTokenId);
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
        Organization.findById(id).populate('users').populate('owner').exec(function (err, organization){
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
            if (err) return handleError(res, err);
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
                    req.user.firstName);
                var asyncFuncs = [];
                for (var i=0; i < req.body.length; i++){
                    var token = tokens[i];
                    var newUser = req.body[i];
                    var func = (function(thisToken, thisUser){
                        return function(callback){
                            var inviteUrl = buildInviteURL(organization._id, thisToken);
                            mailer.sendMailFromUser(subject, 'invite-user-in-org-email.server.view.html',
                                { user: req.user, inviteUrl: inviteUrl, organization: organization },
                                req.user,
                                thisUser.email,
                                callback
                            );
                        }
                    })(token, newUser);
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
                })
            }

            var stripeErrorHandler = function(error){
                console.log(error);
                return res.status(402).send(error);
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