/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
const _ = require('lodash'), errorHandler = require('../errors.server.controller'), mongoose = require('mongoose'), passport = require('passport'), User = mongoose.model('User'), Organization = mongoose.model('Organization'), AccessCode = mongoose.model('AccessCode'), mail = require('../mailer.server.controller.js'), config = require('config'), mailchimp = require('mailchimp-v3'), node_utils = require('@cliques/cliques-node-utils'), models = node_utils.mongodb.models;


const mailer = new mail.Mailer();

// set API key for mailchimp client
mailchimp.setApiKey(config.get('MailChimp.apiKey'));

module.exports = db => ({
    /**
     * Endpoint to gain access to signup page
     */
    authorizeAccessCode: function(req, res) {
        // For security measurement we remove the roles from the req.body object

        const code = req.body.code;
        AccessCode.validate(code, (err, valid, accesscode) => {
            if (err){
                res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                if (valid){
                    if (accesscode.active){
                        res.json({accesscode: accesscode});
                    } else {
                        res.status(400).send({message: 'This code has expired.'});
                    }
                } else {
                    res.status(400).send({message: 'Invalid Code'});
                }
            }
        });
    },

    /**
     * Checks if username is already taken using User.statics.isUsernameTaken
     * @param req
     * @param res
     */
    isUsernameTaken: function(req, res){
        const username = req.param('username');
        User.isUsernameTaken(username, (err, taken) => {
            if (err) return handleError(res, err);
            return res.json({ taken: taken });
        });
    },

    /**
     * Signup
     */
    signup: function(req, res) {
        // flag to tell whether or not user should be made
        // primary contact for organization
        const isOwner= req.body.isOwner;
        const logoUrl = req.body.logo_url;
        const user = new User(req.body);
        const message = null;

        // Add missing user fields
        user.provider = 'local';
        user.displayName = user.firstName + ' ' + user.lastName;
        // Explicitly hash user's password prior to saving
        user.hashPassword();
        // Then save the user
        user.save((err, user) => {
            if (err) return handleError(res, err);
            // Remove sensitive data before login
            user.password = undefined;
            user.salt = undefined;
            // need to re-save organization with reference to user
            Organization.findById(user.organization, (err, org) => {
                if (isOwner) {
                    org.owner = user.id;
                }
                // Add user to organization users
                org.users.push(user.id);

                // Set access token to expired, if present
                if (req.body.accessToken){
                    const accessToken = _.find(org.accessTokens, token => token._id.toString() === req.body.accessToken._id);
                    if (accessToken){
                        accessToken.expired = true;
                    }
                    //TODO: should handle if accessToken isn't found for some reason, but this is prob an edge case
                }

                org.save((err, org) => {
                    if (err) return handleError(res, err);

                    if (org.organization_types[0] === 'advertiser') {
                        // create a default advertiser and attaches it to the new organization
                        const advertiserModels = new models.AdvertiserModels(db);
                        const advertiser = new advertiserModels.Advertiser();

                        advertiser.user = user;
                        advertiser.organization = org;
                        advertiser.name = org.name;
                        advertiser.website = org.website;
                        if (logoUrl) {
                            advertiser.logo_url = logoUrl;
                        }

                        advertiser.save(err => {
                            if (err) {
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            } else {
                                advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, (err, adv) => {
                                    if (err) {
                                        return res.status(400).send({
                                            message: errorHandler.getAndLogErrorMessage(err)
                                        });
                                    }
                                    if (process.env.NODE_ENV === 'production'){
                                        // Now send internal email notifying team of creation
                                        mailer.sendMailFromUser('New Advertiser Created',
                                            'new-advertiser-email.server.view.html',
                                            { advertiser: advertiser, user: req.user },
                                            req.user,
                                            'support@cliquesads.com'
                                        );
                                    }
                                });
                            }
                        });
                    } else if (org.organization_types[0] === 'publisher') {
                        // create a default publisher and attaches it to the new organization
                        const publisherModels = new models.PublisherModels(db);
                        const publisher = new publisherModels.Publisher();
                        publisher.user = user;
                        publisher.organization = org;
                        publisher.name = org.name;
                        publisher.website = org.website;
                        if (logoUrl) {
                            publisher.logo_url = logoUrl;
                        }

                        publisher.save(err => {
                            if (err) {
                                console.log(err);
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            } else {
                                publisherModels.Publisher.populate(publisher, {path: 'user'}, (err, pub) => {
                                    if (err) {
                                        return res.status(400).send({
                                            message: errorHandler.getAndLogErrorMessage(err)
                                        });
                                    }
                                    if (process.env.NODE_ENV === 'production'){
                                        mailer.sendMailFromUser('New Publisher & Site Created',
                                            'new-publisher-email.server.view.html',
                                            { publisher: pub, user: req.user },
                                            req.user,
                                            'support@cliquesads.com'
                                        );
                                    }
                                });
                            }
                        });
                    }
                    // Email support team notifying of account creation
                    if (process.env.NODE_ENV === 'production') {
                        mailer.sendMail({
                            subject: 'New Cliques Console Account Created',
                            templateName: 'new-user-email.server.view.html',
                            to: 'support@cliquesads.com',
                            data: {user: user, organization: org}
                        });
                    }
                    req.login(user, err => {
                        if (err) return handleError(res, err);
                        return res.json(user);
                    });
                    // finally, push user to MailChimp list asynchronously
                    if (process.env.NODE_ENV === 'production'){
                        addUserToMailChimpList(req, user, org);
                    }
                });
            });
        });
    },

    /**
     * Signin after passport authentication
     */
    signin: function(req, res, next) {
        passport.authenticate('local', (err, user, info) => {
            if (err || !user) {
                res.status(400).send(info);
            } else {
                // Remove sensitive data before login
                user.password = undefined;
                user.salt = undefined;

                req.login(user, err => {
                    if (err) {
                        res.status(400).send(err);
                    } else {
                        res.json(user);
                    }
                });
            }
        })(req, res, next);
    },

    /**
     * Signout
     */
    signout: function(req, res) {
        req.logout();
        res.redirect('/');
    },

    /**
     * OAuth callback
     */
    oauthCallback: function(strategy) {
        return (req, res, next) => {
            passport.authenticate(strategy, (err, user, redirectURL) => {
                if (err || !user) {
                    return res.redirect('/#!/signin');
                }
                req.login(user, err => {
                    if (err) {
                        return res.redirect('/#!/signin');
                    }

                    return res.redirect(redirectURL || '/');
                });
            })(req, res, next);
        };
    },

    /**
     * Helper function to save or update a OAuth user profile
     */
    saveOAuthUserProfile: function(req, providerUserProfile, done) {
        if (!req.user) {
            // Define a search query fields
            const searchMainProviderIdentifierField = 'providerData.' + providerUserProfile.providerIdentifierField;
            const searchAdditionalProviderIdentifierField = 'additionalProvidersData.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

            // Define main provider search query
            const mainProviderSearchQuery = {};
            mainProviderSearchQuery.provider = providerUserProfile.provider;
            mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

            // Define additional provider search query
            const additionalProviderSearchQuery = {};
            additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

            // Define a search query to find existing user with current provider profile
            const searchQuery = {
                $or: [mainProviderSearchQuery, additionalProviderSearchQuery]
            };

            User.findOne(searchQuery, (err, user) => {
                if (err) {
                    return done(err);
                } else {
                    if (!user) {
                        const possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

                        User.findUniqueUsername(possibleUsername, null, availableUsername => {
                            user = new User({
                                firstName: providerUserProfile.firstName,
                                lastName: providerUserProfile.lastName,
                                username: availableUsername,
                                displayName: providerUserProfile.displayName,
                                email: providerUserProfile.email,
                                provider: providerUserProfile.provider,
                                providerData: providerUserProfile.providerData
                            });

                            // And save the user
                            // TODO: need to hashPassword here??
                            user.save(err => done(err, user));
                        });
                    } else {
                        return done(err, user);
                    }
                }
            });
        } else {
            // User is already logged in, join the provider data to the existing user
            const user = req.user;

            // Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
            if (user.provider !== providerUserProfile.provider && (!user.additionalProvidersData || !user.additionalProvidersData[providerUserProfile.provider])) {
                // Add the provider data to the additional provider data field
                if (!user.additionalProvidersData) user.additionalProvidersData = {};
                user.additionalProvidersData[providerUserProfile.provider] = providerUserProfile.providerData;

                // Then tell mongoose that we've updated the additionalProvidersData field
                user.markModified('additionalProvidersData');

                // And save the user
                // TODO: need to hashPassword here??
                user.save(err => done(err, user, '/#!/settings/accounts'));
            } else {
                return done(new Error('User is already connected using this provider'), user);
            }
        }
    },

    /**
     * Remove OAuth provider
     */
    removeOAuthProvider: function(req, res, next) {
        const user = req.user;
        const provider = req.param('provider');

        if (user && provider) {
            // Delete the additional provider
            if (user.additionalProvidersData[provider]) {
                delete user.additionalProvidersData[provider];

                // Then tell mongoose that we've updated the additionalProvidersData field
                user.markModified('additionalProvidersData');
            }

            user.save(err => {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    req.login(user, err => {
                        if (err) {
                            res.status(400).send(err);
                        } else {
                            res.json(user);
                        }
                    });
                }
            });
        }
    }
});

/**
 * Shortcut to handle errors
 */
function handleError(res, err){
    return res.status(400).send({
        message: errorHandler.getAndLogErrorMessage(err)
    });
}

/**
 * Adds user to "newsletter" and appropriate orgType email lists in MailChimp.
 *
 * Uses MailChimp v3 API wrapper.
 *
 * @param req
 * @param user
 * @param org
 */
var addUserToMailChimpList = (req, user, org) => {
	function _listMemberEndpoint(listId){
		return 'lists/' + listId + '/members';
	}
	// subfunc to subscribe user to list, will simply log success or failure
	function _subscribeToList(listId, payload){
		// subscribe to newsletter list
		mailchimp.post(_listMemberEndpoint(listId), payload).
		then(response => {
			console.info("MAILCHIMP: Added member ID " + response.id + " (" + response.email_address + ") to list " + response.list_id);
		}).
		catch(error => {
			console.error("MAILCHIMP ERROR title " + error.title + " - type " + error.type + " - status " +
				error.status + " - detail " + error.detail + " - instance " + error.instance);
		});
	}

	// see http://developer.mailchimp.com/documentation/mailchimp/reference/lists/members/
	// for field descriptions
	const payload = {
		status: "subscribed",
		merge_fields: {
			FNAME: user.firstName,
			LNAME: user.lastName
		},
		email_address: user.email,
		ip_signup: req.clientIp,
		ip_opt: req.clientIp
	};

	// I don't give a shit what order this happens in, so not chaining these promises
	// ALSO, chaining Bluebird promises at first glance is extremely annoying, so not
	// even going to try

	// subscribe to newsletter list
	_subscribeToList(config.get('MailChimp.listIds.newsletter'), payload);

	// now subscribe to orgType specific lists
	if (org.effectiveOrgType === 'advertiser'){
		_subscribeToList(config.get('MailChimp.listIds.advertiser'), payload);
	} else if (org.effectiveOrgType === 'publisher'){
		_subscribeToList(config.get('MailChimp.listIds.publisher'), payload);
	}
};
