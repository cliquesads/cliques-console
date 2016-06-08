/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
	BasicStrategy = require('passport-http').BasicStrategy,
	User = require('mongoose').model('User');

module.exports = function() {
	// Use basic auth strategy
	passport.use(new BasicStrategy(
		function(username, password, done) {
			User.findOne({ username: username}).populate('organization').exec(function(err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					return done(null, false, {
						message: 'Unknown user or invalid password'
					});
				}
				if (!user.authenticate(password)) {
					return done(null, false, {
						message: 'Unknown user or invalid password'
					});
				} else {
					console.log('Authenticated!!!!!!')
				}

				return done(null, user);
			});
		}
	));
};