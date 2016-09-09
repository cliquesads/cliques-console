/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	crypto = require('crypto'),
	async = require('async'),
	_ = require('lodash'),
	billing = require('./billing.server.model');

/**
 * A Validation function for local strategy properties
 */
var validateLocalStrategyProperty = function(property) {
	return ((this.provider !== 'local' && !this.updated) || property.length);
};

/**
 * A Validation function for local strategy password
 */
var validateLocalStrategyPassword = function(password) {
	return (this.provider !== 'local' || (password && password.length > 6));
};

var USER_ROLES = ['admin','readWrite','readOnly'];

/**
 * User Schema
 */
var UserSchema = new Schema({
	firstName: {
		type: String,
		trim: true,
		default: '',
		validate: [validateLocalStrategyProperty, 'Please fill in your first name']
	},
	lastName: {
		type: String,
		trim: true,
		default: '',
		validate: [validateLocalStrategyProperty, 'Please fill in your last name']
	},
	displayName: {
		type: String,
		trim: true
	},
	email: {
		type: String,
		trim: true,
		default: '',
		validate: [validateLocalStrategyProperty, 'Please fill in your email'],
		match: [/.+\@.+\..+/, 'Please fill a valid email address']
	},
	username: {
		type: String,
		unique: 'This username is already in use',
		index: true,
		required: 'Please fill in a username',
		trim: true
	},
	// lower case username used to perform efficient case insensitive queries
	// will be generated automatically in pre-save hook
	username_lower: {
		type: String,
		index: true,
		trim: true
	},
	password: {
		type: String,
		default: '',
		validate: [validateLocalStrategyPassword, 'Password should be longer']
	},
	salt: {
		type: String
	},
	provider: {
		type: String,
		required: 'Provider is required'
	},
	providerData: {},
	additionalProvidersData: {},
	//TODO: TEMPORARY, REMOVE WHEN MIGRATED TO USE ROLE
	roles: {
		type: [{
			type: String,
			enum: USER_ROLES
		}],
		default: ['admin']
	},
	//NEW, ATOMIC ROLE
	role: {
		type: String,
		enum: USER_ROLES,
		default: ['admin']
	},
    tz: { type: String, default: 'America/New_York',enum: ['America/Los_Angeles','America/Denver','America/Chicago','America/New_York']},
	updated: {
		type: Date
	},
	created: {
		type: Date,
		default: Date.now
	},
	/* For reset password */
	resetPasswordToken: {
		type: String
	},
	resetPasswordExpires: {
		type: Date
	},
    accesscode: {
        type: Schema.ObjectId,
        ref: 'AccessCode'
    },
    organization: {
        type: Schema.ObjectId,
        ref: 'Organization'
    },
	avatarUrl: {
		type: String
	}
},{
	toObject: { virtuals: true },
	toJSON: { virtuals: true }
});

// Virtual field to retrieve secure URL
UserSchema.virtual('secureAvatarUrl').get(function(){
	if (this.avatarUrl){
		return this.avatarUrl.replace('http://', 'https://');
	}
});

/**
 * Hook to EXPLICITLY call pre-save when handling user creation or password updates
 */
UserSchema.methods.hashPassword = function(){
	if (this.password && this.password.length > 6){
		this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
		this.password = this._hashPassword(this.password);
	}
};

/**
 * Create instance method for hashing a password
 */
UserSchema.methods._hashPassword = function(password){
	if (this.salt && password) {
		return crypto.pbkdf2Sync(password, this.salt, 10000, 64).toString('base64');
	} else {
		return password;
	}
};

/**
 * Create instance method for authenticating user
 */
UserSchema.methods.authenticate = function(password) {
	return this.password === this._hashPassword(password);
};

/**
 * Check to see whether a given username is already taken
 *
 * @param username
 * @param callback
 */
UserSchema.statics.isUsernameTaken = function(username, callback){
    var _this = this;
    _this.findOne({ username_lower: username.toLowerCase() }, function(err, user){
        if (err) return callback(err, null);
        return callback(null, user ? true : false)
    });
};

/**
 * Find possible not used username
 */
UserSchema.statics.findUniqueUsername = function(username, suffix, callback) {
	var _this = this;
	var possibleUsername = username + (suffix || '');

	_this.findOne({
		username: possibleUsername
	}, function(err, user) { 
		if (!err) {
			if (!user) {
				callback(possibleUsername);
			} else {
				return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
			}
		} else {
			callback(null);
		}
	});
};

/**
 * Hook a pre save method to save lowercase version of username
 */
UserSchema.pre('save', function(next) {
	this.username_lower = this.username.toLowerCase();
	next();
});

var User = mongoose.model('User', UserSchema);

/**
 * Small schema to store some important metadata about
 * Terms & Conditions agreements
 * @type {Schema}
 */
var termsAndConditionsSchema = new Schema({
    tstamp: {type: Date, default: Date.now},
    name: { type: String, required: true },
    type: {type: String, enum: ['advertiser', 'publisher']},
    templatePath: { type: String, required: true },
    url: {type: String, required: true },
    notes: { type: String, required: true },
    active: { type: Boolean, required: true, default: false }
});
exports.TermsAndConditions = mongoose.model('TermsAndConditions', termsAndConditionsSchema);


var accessTokenSchema = new Schema({
	_id: {type: Schema.ObjectId, required: true},
	tstamp: {type: Date, default: Date.now},
	role: {
		type: String,
		enum: USER_ROLES,
		default: 'readWrite'
	},
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	email: { type: String, required: true },
	expired: { type: Boolean, required: true, default: false }
});

/**
 * Organization is a collection of users
 *
 * @type {Schema}
 */
var organizationSchema = new Schema({
    tstamp: {type: Date, default: Date.now},
    name: { type: String, required: true },
    owner: { type: Schema.ObjectId, ref: 'User'},
    website: { type: String, required: false },
    address: { type: String, required: true },
    address2: { type: String, required: false },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zip: { type: String, required: true },
    phone: { type: String, required: true },
    accesscode: { type: Schema.ObjectId,ref: 'AccessCode' },
    // can agree to multiple terms & conditions
    termsAndConditions: [{ type: Schema.ObjectId,ref: 'TermsAndConditions' }],
    additionalTerms: { type: String, required: false },
	accessTokens: [accessTokenSchema],
	promos: [billing.PromoSchema],
	payments: [{ type: Number, ref: 'Payment'}],
	// TODO: Add validation to ensure only one active fee structure per org type
    fees: [billing.FeeSchema],
	organization_types: {
		type: [{
			type: String,
			enum: ['advertiser','publisher','networkAdmin']
		}],
		default: ['advertiser']
	},
    users: [{ type: Schema.ObjectId, ref: 'User'}],
	// Billing stuff
	billingPreference: { type: String, required: true, default: 'Check', enum: billing.BILLING_METHODS },
	billingEmails: [{ type: String}],
	sendStatementToOwner: { type: Boolean, required: true, default: true },
	stripeCustomerId: { type: String }, // for Advertisers
	stripeAccountId: { type: String }, // for Publishers

	// Quickbooks entity IDs
	qboVendorId: { type: String }, // for Publishers
	qboCustomerId: { type: String } // for Advertisers
},{
	toObject: { virtuals: true },
	toJSON: { virtuals: true }
});


/**
 * accountBalance virtual property sums all outstanding invoices and active promos
 *
 * DOES NOT modify or "apply" any promos on org, should just be considered a "preview"
 * of what the account balance is after all promos are applied.
 *
 * NOTE: Requires `payments` field to be populated on self.
 *
 * !!!!!! NOTE ON SIGNS: !!!!!!
 * Due to how signs on Payments (see docstring for Payments Model) are handled:
 * - A POSITIVE balance means that money is OWED to Cliques
 * - A NEGATIVE balance means that the ORGANIZATION is OWED money from Cliques.
 */
organizationSchema.virtual('accountBalance')
	.get(function(){
		var self = this;
		// check if value has been set temporarily, just return it if so
		if (self._tmpBalance) return self._tmpBalance;

		// Otherwise, go through the summation
		// first total up all outstanding (i.e. Pending or Overdue) payments
		var total = this.getOutstandingPaymentTotals();

		// add promos as well
		// NOTE: this doesn't actually touch the promoAmount or active property
		if (self.promos){
			var filtered_promos = self.promos.filter(function(p){
				return p.active;
			});
			total += _.sumBy(filtered_promos, 'promoAmount');
		}
		return total;
	})
	// setter to allow for temporary manipulation of balance for display purposes
	.set(function(tmpBalance){
		this._tmpBalance = tmpBalance;
	});

/**
 * Just a shim.  Have organiztion_types as an array currently, but need
 * easy access to single type for some purposes.
 */
organizationSchema.virtual('effectiveOrgType').get(function(){
	return this.organization_types[0];
});

/**
 * Virtual property for fully-qualified (i.e. w/ http prefix) URI for org website, if
 * it's not entered as a fully-qualified URI already.
 */
organizationSchema.virtual('URI').get(function(){
	var protocol_substring = 'http';
	if (this.website){
		if (this.website.substr(0, protocol_substring.length) != protocol_substring){
			return protocol_substring + '://' + this.website;
		}
	}
	return this.website;
});

/**
 * Convenience method mapping org fields to Quickbooks Vendor object
 *
 * Designed for QBO API v3
 * @returns {{}}
 */
organizationSchema.methods.toQuickbooksVendor = function(){
	var self = this;
	return {
		"BillAddr": {
			"Line1": self.address,
			"Line2": self.address2,
			"City": self.city,
			"Country": self.country,
			"CountrySubDivisionCode": self.state,
			"PostalCode": self.zip
		},
		"AcctNum": self._id,
		"CompanyName": self.name,
		"DisplayName": self.name,
		"PrintOnCheckName": self.name,
		"PrimaryEmailAddr": {
			"Address": self.owner.email
		},
		"WebAddr": {
			"URI": self.URI
		},
		"PrimaryPhone": {
			"FreeFormNumber": self.phone
		}
	}
};

/**
 * Synchronous function to get all outstanding payments for an Organization
 *
 * Totals up all "Pending" or "Overdue" payments, and applies all active promos,
 * updating promo totals & deactivating promos as applicable.
 */
organizationSchema.methods.getOutstandingPayments = function(){
	if (this.payments){
		return this.payments.filter(function(p){
			return p.status === 'Pending' || p.status === 'Overdue';
		});
	}
};

organizationSchema.methods.getOutstandingPaymentTotals = function(){
	var total = 0;
	var payments = this.getOutstandingPayments();
	if (payments){
		total += _.sumBy(payments, 'totalAmount');
	}
	return total;
};

/**
 * Waterfalls down promos on organization and applies each to a given total.
 *
 * Deducts amount applied from promo.promoAmount, and sets promo.active to false if promo is
 * completely used up.
 *
 * NOTE: Does NOT re-save org after modifying promos used, that's up to you to do.
 *
 * TODO: All of this promo logic assumes that Advertiser/Publisher promos have negative/positive promoAmounts,
 * TODO: which is logical but not enforced in any way.  So if an advertiser/publisher promo is positive/negative,
 * TODO: the results of this waterfall will be all fucked up.
 *
 * Returns object { total: <new total>, applied_promos: [<array of promos that were used>] }
 *
 * Promo objects in applied_promos array include `amountUsed` property which contains the precise amount
 * of that promo that was applied to the total.
 *
 * @param total
 * @returns { total: <new total after promos>, applied_promos: [<array of promo objects that were applied>] }
 */
organizationSchema.methods.applyPromosToTotal = function(total){
	var self = this;
	if (self.promos){
		var filtered_promos = self.promos.filter(function(p){
			return p.active;
		});
		var applied_promos = [];
		filtered_promos.forEach(function(promo){
			// handle advertiser & publisher promos differently, since you can technically use "part" of a promo
			// when you're an advertiser, but not as a publisher
			switch (self.effectiveOrgType) {
				case 'advertiser':
					// TODO: Handle "percentage" promos here -- i.e. promos w/ % and minimum spend levels
					// waterfall down the promos, add each from total
					// set active to false if promo is all used up
					if (total) {
						// deactivate & clear promoAmount if promo total is less
						// than total of payments due.
						if (Math.abs(total) >= Math.abs(promo.promoAmount)){
							total += promo.promoAmount;
							promo.promoAmount = 0;
							promo.active = false;
							// now append to applied_promos array for reference
							promo.amountUsed = promo.promoAmount; // this is a fake property, only used by caller methods
							applied_promos.push(promo);
							// otherwise, just deduct total from promoAmount, zero out total
							// but keep promo active for use next time.
						} else {
							promo.promoAmount = promo.promoAmount + total;
							promo.amountUsed = total;
							// zero out total, since promo amount is greater
							total = 0;
							// now append to applied_promos array for reference
							applied_promos.push(promo);
						}
					}
					break;
				case 'publisher':
					filtered_promos.forEach(function(promo){
						total += promo.promoAmount;
						promo.active = false;
						promo.amountUsed = promo.promoAmount;
						applied_promos.push(promo);
					});
					break;
			}
		});
	}
	return { total: total, applied_promos: applied_promos };
};

/**
 * Central method to handle logic around billingEmail settings, returning
 * single array of all emails to send billing emails to
 *
 * @returns {Array}
 */
organizationSchema.methods.getAllBillingEmails = function(){
	var billingEmails = [];
	if (!_.isNil(this.billingEmails)) {
		if (this.billingEmails.length > 0) {
			billingEmails = this.billingEmails;
		}
	}
	if (this.sendStatementToOwner) {
		billingEmails.push(this.owner.email);
	}
	return billingEmails
};

var Organization = mongoose.model('Organization', organizationSchema);


/**
 * Access codes for private beta to allow users to sign up
 * @type {Schema}
 */
var AccessCodeSchema = new Schema({
    code: {
        type: String,
        default: '',
        validate: [validateLocalStrategyPassword, 'Code should be longer']
    },
    salt: {
        type: String
    },
    created: {
        type: Date,
        default: Date.now
    },
    active: { type: Boolean, default: true, required: true },
    fees: [billing.FeeSchema],
    promos: [billing.PromoSchema],
	// stuff to track who "issued" the access code, and what they get when it's used
	issuerOrgs: [{ type: Schema.ObjectId, ref: 'Organization'}],
	issuerSignupPromo: billing.PromoSchema,
	issuerCampaignPromo: billing.PromoSchema,
	issuerSitePromo: billing.PromoSchema
});

/**
 * Hook a pre save method to hash the password
 */
// AccessCodeSchema.pre('save', function(next) {
//     if (this.code && this.code.length > 6) {
//         this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
//         this.code = this.hashCode(this.code);
//     }
//     next();
// });
AccessCodeSchema.methods.hashCode = function(code) {
    if (this.salt && code) {
        return crypto.pbkdf2Sync(code, this.salt, 10000, 64).toString('base64');
    } else {
        return code;
    }
};
AccessCodeSchema.statics.validate = function(code, callback) {
    var _this = this;
    _this.find({}, function(err, codes) {
        if (!err){
            var valid = false;
            var accesscode;
            codes.forEach(function(c){
                if (c.code === c.hashCode(code)){
                    valid = true;
                    accesscode = c;
                }
            });
            callback(null, valid, accesscode);
        } else {
            callback(err);
        }
    });
};

/**
 * Adds appropriate promos to issuer organizations and sends them an email letting them
 * know that their access code was redeemed.
 *
 * @param promoType either "Signup", "Campaign" or "Site"
 * @param callback gets (err, usersAndPromos).  usersAndPromos is array of
 * 		{ user: <User instance>, promo: <Promo instance> } objects
 * 		indicating which users to email messages to regarding promos issued.
 */
AccessCodeSchema.methods.redeemIssuerPromos = function(promoType, callback){
	var self = this;
	var promo;

	switch (promoType){
		case 'Signup':
			promo = self.issuerSignupPromo;
			break;
		case 'Campaign':
			promo = self.issuerCampaignPromo;
			break;
		case 'Site':
			promo = self.issuerSitePromo;
			break;
	}

	if (!_.isNil(this.issuerOrgs) && this.issuerOrgs.length > 0){
		Organization.find({ _id: this.issuerOrgs }, function(err, orgs){
			if (err) return callback(err);
			var parallel = [];
			// create parallel functions to add promos to org, save and email org owner
			orgs.forEach(function(issuerOrg){

				parallel.push(function(cb){
					// inner function to find owner of org & push obj to results
					var _inner = function(err, o){
						if (err) return cb(err);
						User.findById(o.owner, function(err, user){
							if (err) return cb(err);
							// push user & promo object to results array
							return cb(null, { user: user, promo: promo });
						});
					};

					// push promo to org promos to be redeemed
					if (promo && promo.active){
						issuerOrg.promos.push(promo);
						issuerOrg.save(function(err,issuerOrg){
							if (err) return cb(err);
							promo.active = false;
							// re-save access code b/c promo to deactivate promo
							self.save(function(e, ac){
								_inner(e,issuerOrg);
							});
						});
					} else {
						_inner(err, issuerOrg);
					}
				});
			});
			async.parallel(parallel, callback);
		});
	}
};

exports.AccessCode = mongoose.model('AccessCode', AccessCodeSchema);