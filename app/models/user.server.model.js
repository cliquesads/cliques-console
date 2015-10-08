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
			enum: ['advertiser','publisher','admin']
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
    }
});

/**
 * Hook a pre save method to hash the password
 */
UserSchema.pre('save', function(next) {
	if (this.password && this.password.length > 6) {
		this.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
		this.password = this.hashPassword(this.password);
	}

	next();
});

/**
 * Create instance method for hashing a password
 */
UserSchema.methods.hashPassword = function(password) {
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
	return this.password === this.hashPassword(password);
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

mongoose.model('User', UserSchema);

/**
 * Groups of users, used for internal purposes
 *
 * @type {Schema}
 */
var UserGroupSchema = new Schema({
    name: { type: String, required: true },
    users: [{ type: Schema.ObjectId, ref: 'User'}]
});
mongoose.model('UserGroup', UserSchema);


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
    }
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