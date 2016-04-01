/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	crypto = require('crypto');

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
	roles: {
		type: [{
			type: String,
			enum: ['advertiser','publisher','admin','networkAdmin']
		}],
		default: ['advertiser']
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

exports.User = mongoose.model('User', UserSchema);

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

/**
 * Separate schema to handle fee logic
 */
var feeSchema = new Schema({
    type: { type: String, enum: ['advertiser', 'publisher'] },
    percentage: { type: Number, required: true, default: 0.10 },
    // Futureproofing, in case we ever charge fixed fees for something
    fixedFee: { type: Number, required: false },
    fixedFeeInterval: { type: String, required: false }
});

var accessTokenSchema = new Schema({
	_id: {type: Schema.ObjectId, required: true},
	roles: {
		type: [{
			type: String,
			enum: ['advertiser','publisher','admin','networkAdmin']
		}],
		default: ['advertiser']
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
    primaryContact: { type: Schema.ObjectId, ref: 'User'},
    website: { type: String, required: true },
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
    fees: [feeSchema],
    users: [{ type: Schema.ObjectId, ref: 'User'}]
});
exports.Organization = mongoose.model('Organization', organizationSchema);


/**
 * Separate schema to handle promo
 */
var promoSchema = new Schema({
    type: { type: String, enum: ['advertiser', 'publisher'] },
    description: { type: String, required: true },
    promoAmount: { type: Number, required: false },
    promoInterval: { type: String, required: false }
});
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
    fees: [feeSchema],
    promos: [promoSchema]
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