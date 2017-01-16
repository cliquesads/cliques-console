/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	errorHandler = require('../errors.server.controller'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	User = mongoose.model('User'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    mail = require('../mailer.server.controller.js'),
	config = require('config'),
	mailchimp = require('mailchimp-v3'),
	node_utils = require('@cliques/cliques-node-utils'),
    models = node_utils.mongodb.models;


var mailer = new mail.Mailer();

// set API key for mailchimp client
mailchimp.setApiKey(config.get('MailChimp.apiKey'));

function generateDefaultAdvertiser() {
	return {
		name: '',
		description: null,
		website: '',
		logo_url: '',
		campaigns: []
	};
}

/**
 * Endpoint to gain access to signup page
 */
exports.authorizeAccessCode = function(req, res) {
    // For security measurement we remove the roles from the req.body object

    var code = req.body.code;
    AccessCode.validate(code, function(err, valid, accesscode){
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
};

/**
 * Shortcut to handle errors
 */
function handleError(res, err){
    return res.status(400).send({
        message: errorHandler.getAndLogErrorMessage(err)
    });
}

/**
 * Checks if username is already taken using User.statics.isUsernameTaken
 * @param req
 * @param res
 */
exports.isUsernameTaken = function(req, res){
    var username = req.param('username');
    User.isUsernameTaken(username, function(err, taken){
        if (err) return handleError(res, err);
        return res.json({ taken: taken });
    });
};


/**
 * Adds user to "newsletter" and appropriate orgType email lists in MailChimp.
 *
 * Uses MailChimp v3 API wrapper.
 *
 * @param req
 * @param user
 * @param org
 */
var addUserToMailChimpList = function(req, user, org){
	function _listMemberEndpoint(listId){
		return 'lists/' + listId + '/members';
	}
	// subfunc to subscribe user to list, will simply log success or failure
	function _subscribeToList(listId, payload){
		// subscribe to newsletter list
		mailchimp.post(_listMemberEndpoint(listId), payload).
		then(function(response){
			console.info("MAILCHIMP: Added member ID " + response.id + " (" + response.email_address + ") to list " + response.list_id);
		}).
		catch(function(error){
			console.error("MAILCHIMP ERROR title " + error.title + " - type " + error.type + " - status " +
				error.status + " - detail " + error.detail + " - instance " + error.instance);
		});
	}

	// see http://developer.mailchimp.com/documentation/mailchimp/reference/lists/members/
	// for field descriptions
	var payload = {
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

/**
 * Signup
 */
exports.signup = function(req, res) {
    // flag to tell whether or not user should be made
    // primary contact for organization
    var isOwner= req.body.isOwner;
    var user = new User(req.body);
    var message = null;

    // Add missing user fields
    user.provider = 'local';
    user.displayName = user.firstName + ' ' + user.lastName;
    // Explicitly hash user's password prior to saving
	user.hashPassword();
	// Then save the user
    user.save(function(err, user) {
        if (err) return handleError(res, err);
        // Remove sensitive data before login
        user.password = undefined;
        user.salt = undefined;
        // need to re-save organization with reference to user
        Organization.findById(user.organization, function (err, org) {
            if (isOwner) {
                org.owner = user.id;
            }
            // Add user to organization users
            org.users.push(user.id);

			// Set access token to expired, if present
			if (req.body.accessToken){
				var accessToken = _.find(org.accessTokens, function(token){
					return token._id.toString() === req.body.accessToken._id;
				});
				if (accessToken){
					accessToken.expired = true;
				}
				//TODO: should handle if accessToken isn't found for some reason, but this is prob an edge case
			}

            org.save(function (err, org) {
                if (err) return handleError(res, err);

                // create a default advertiser and attaches it to the new organization
                if (org.organization_types[0] === 'advertiser') {
                	var advertiserModels = new models.AdvertiserModels(global.db);
                	var advertiser = new advertiserModels.Advertiser(generateDefaultAdvertiser());
                	advertiser.user = user;
                	advertiser.organization = org;
                	advertiser.name = org.name;
                	advertiser.website = org.website;

                	advertiser.save(function(err) {
                		if (err) {
                			return res.status(400).send({
                				message: errorHandler.getAndLogErrorMessage(err)
                			});
                		} else {
                			advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, function(err, adv){
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
                req.login(user, function (err) {
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
};

/**
 * Signin after passport authentication
 */
exports.signin = function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err || !user) {
			res.status(400).send(info);
		} else {
			// Remove sensitive data before login
			user.password = undefined;
			user.salt = undefined;

			req.login(user, function(err) {
				if (err) {
					res.status(400).send(err);
				} else {
					res.json(user);
				}
			});
		}
	})(req, res, next);
};

/**
 * Signout
 */
exports.signout = function(req, res) {
	req.logout();
	res.redirect('/');
};

/**
 * OAuth callback
 */
exports.oauthCallback = function(strategy) {
	return function(req, res, next) {
		passport.authenticate(strategy, function(err, user, redirectURL) {
			if (err || !user) {
				return res.redirect('/#!/signin');
			}
			req.login(user, function(err) {
				if (err) {
					return res.redirect('/#!/signin');
				}

				return res.redirect(redirectURL || '/');
			});
		})(req, res, next);
	};
};

/**
 * Helper function to save or update a OAuth user profile
 */
exports.saveOAuthUserProfile = function(req, providerUserProfile, done) {
	if (!req.user) {
		// Define a search query fields
		var searchMainProviderIdentifierField = 'providerData.' + providerUserProfile.providerIdentifierField;
		var searchAdditionalProviderIdentifierField = 'additionalProvidersData.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

		// Define main provider search query
		var mainProviderSearchQuery = {};
		mainProviderSearchQuery.provider = providerUserProfile.provider;
		mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

		// Define additional provider search query
		var additionalProviderSearchQuery = {};
		additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

		// Define a search query to find existing user with current provider profile
		var searchQuery = {
			$or: [mainProviderSearchQuery, additionalProviderSearchQuery]
		};

		User.findOne(searchQuery, function(err, user) {
			if (err) {
				return done(err);
			} else {
				if (!user) {
					var possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

					User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
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
						user.save(function(err) {
							return done(err, user);
						});
					});
				} else {
					return done(err, user);
				}
			}
		});
	} else {
		// User is already logged in, join the provider data to the existing user
		var user = req.user;

		// Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
		if (user.provider !== providerUserProfile.provider && (!user.additionalProvidersData || !user.additionalProvidersData[providerUserProfile.provider])) {
			// Add the provider data to the additional provider data field
			if (!user.additionalProvidersData) user.additionalProvidersData = {};
			user.additionalProvidersData[providerUserProfile.provider] = providerUserProfile.providerData;

			// Then tell mongoose that we've updated the additionalProvidersData field
			user.markModified('additionalProvidersData');

			// And save the user
			// TODO: need to hashPassword here??
			user.save(function(err) {
				return done(err, user, '/#!/settings/accounts');
			});
		} else {
			return done(new Error('User is already connected using this provider'), user);
		}
	}
};

/**
 * Remove OAuth provider
 */
exports.removeOAuthProvider = function(req, res, next) {
	var user = req.user;
	var provider = req.param('provider');

	if (user && provider) {
		// Delete the additional provider
		if (user.additionalProvidersData[provider]) {
			delete user.additionalProvidersData[provider];

			// Then tell mongoose that we've updated the additionalProvidersData field
			user.markModified('additionalProvidersData');
		}

		user.save(function(err) {
			if (err) {
				return res.status(400).send({
					message: errorHandler.getAndLogErrorMessage(err)
				});
			} else {
				req.login(user, function(err) {
					if (err) {
						res.status(400).send(err);
					} else {
						res.json(user);
					}
				});
			}
		});
	}
};