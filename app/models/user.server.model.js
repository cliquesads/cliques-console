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
var validateLocalStrategyProperty = exports.validateLocalStrategyPassword = function(property) {
	return ((this.provider !== 'local' && !this.updated) || property.length);
};

/**
 * A Validation function for local strategy password
 */
var validateLocalStrategyPassword = exports.validateLocalStrategyPassword = function(password) {
	return (this.provider !== 'local' || (password && password.length > 6));
};

var USER_ROLES = exports.USER_ROLES = ['admin','readWrite','readOnly','observer','serviceAccount'];

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
		return crypto.pbkdf2Sync(password, new Buffer(this.salt,'binary'), 10000, 64, 'sha1').toString('base64');
	} else {
		return password;
	}
};

/**
 * Create instance method for authenticating user
 */
UserSchema.methods.authenticate = function(password) {
	var hashedPass = this._hashPassword(password);
	return this.password === hashedPass;
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
        return callback(null, user ? true : false);
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