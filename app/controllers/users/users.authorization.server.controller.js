/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	auth = require('basic-auth');

/**
 * User middleware
 */
exports.userByID = function(req, res, next, id) {
	User.findOne({_id: id})
        .populate('organization')
        .exec(function(err, user) {
            if (err) return next(err);
            if (!user) return next(new Error('Failed to load User ' + id));
            req.profile = user;
            next();
	    });
};


exports.basicAuth = function(req, res, next){
	var credentials = auth(req);
	console.log(credentials);
	User.findOne({ username: credentials.name }).populate('organization').exec(function(err, user) {
		if (err) {
			return next(err);
		}
		if (!user) {
			return next('Unknown user or invalid password');
		}
		if (!user.authenticate(credentials.pass)) {
			return next('Unknown user or invalid password');
		}
		req.user = user;
		req.basicAuthValidated = true;
		return next();
	});
};

/**
 * Require login routing middleware
 */
exports.requiresLogin = function(req, res, next) {
	if (!req.isAuthenticated()) {
		return res.status(401).send({
			message: 'User is not logged in'
		});
	}
	next();
};

/**
 * User authorizations routing middleware
 */
exports.hasAuthorization = function(roles) {
	var _this = this;

	return function(req, res, next) {
		_this.requiresLogin(req, res, function() {
			if (_.intersection(req.user.roles, roles).length) {
				return next();
			} else {
				return res.status(403).send({
					message: 'User is not authorized'
				});
			}
		});
	};
};