/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	crypto = require('crypto'),
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

/**
 * Hook a pre save method to hash the password
 *
 * NOTE: Removed pre-save hook in favor of explicitly hashing passwords
 * on save when applicable, as this will destroy old passwords if called accidentally.
 */
// UserSchema.pre('save', function(next) {
// 	if (this.password && this.password.length > 6) {
// 		this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
// 		this.password = this._hashPassword(this.password);
// 	}
// 	next();
// });

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
    _this.findOne({ username: username}, function(err, user){
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
	stripeAccountId: { type: String } // for Publishers
	// accountBalance: { type: Number, required: true, default: 0 }
},{
	toObject: { virtuals: true },
	toJSON: { virtuals: true }
});


/**
 * accountBalance virtual property sums all outstanding invoices and promos
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
		var total = 0;
		//TODO: self.populated doesn't work properly when document has been populated via nested population
		// if (self.populated('payments')){
		// only get payments that aren't paid
		if (self.payments){
			var filtered =  self.payments.filter(function(p){
				return p.status === 'Pending' || p.status === 'Overdue';
			});
			total += _.sumBy(filtered, 'totalAmount');
		}

		// add promos as well
		if (self.promos){
			total += _.sumBy(self.promos, 'promoAmount');
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
    promos: [billing.PromoSchema]
});

/**
 * Hook a pre save method to hash the password
 */
AccessCodeSchema.pre('save', function(next) {
    if (this.code && this.code.length > 6) {
        this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
        this.code = this.hashCode(this.code);
    }
    next();
});
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
exports.AccessCode = mongoose.model('AccessCode', AccessCodeSchema);