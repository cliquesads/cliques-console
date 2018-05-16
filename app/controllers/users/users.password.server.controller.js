/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
const _ = require('lodash'), errorHandler = require('../errors.server.controller'), mongoose = require('mongoose'), passport = require('passport'), User = mongoose.model('User'), config = require('../../../config/config'), nodemailer = require('nodemailer'), async = require('async'), crypto = require('crypto');

/**
 * Forgot for reset password (forgot POST)
 */
exports.forgot = (req, res, next) => {
	async.waterfall([
		done => {
			crypto.randomBytes(20, (err, buffer) => {
				const token = buffer.toString('hex');
				done(err, token);
			});

		},
		(token, done) => {
			if (req.body.username) {
				User.findOne({
					username_lower: req.body.username.toLowerCase()
				}, '-salt -password', (err, user) => {
					if (!user) {
						return res.status(400).send({
							message: 'No account with that username has been found'
						});
					} else if (user.provider !== 'local') {
						return res.status(400).send({
							message: `It seems like you signed up using your ${user.provider} account`
						});
					} else {
						user.resetPasswordToken = token;
						user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

						user.save(err => {
							done(err, token, user);
						});
					}
				});
			} else {
				return res.status(400).send({
					message: 'Username field must not be blank'
				});
			}
		},
		(token, user, done) => {
			res.render('templates/reset-password-email', {
				name: user.displayName,
				appName: config.app.title,
				url: `http://${req.headers.host}/auth/reset/${token}`
			}, (err, emailHTML) => {
				done(err, emailHTML, user);
			});
		},
		(emailHTML, user, done) => {
			const smtpTransport = nodemailer.createTransport(config.mailer.options);
			const mailOptions = {
				to: user.email,
				from: config.mailer.from,
				subject: 'Password Reset',
				html: emailHTML
			};
			smtpTransport.sendMail(mailOptions, err => {
				if (!err) {
					res.send({
						message: `An email has been sent to ${user.email} with further instructions.`
					});
				}
				done(err);
			});
		}
	], err => {
		if (err) return next(err);
	});
};

/**
 * Reset password GET from email token
 */
exports.validateResetToken = (req, res) => {
	User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: {
			$gt: Date.now()
		}
	}, (err, user) => {
		if (!user) {
			return res.redirect('/#!/password/reset/invalid');
		}

		res.redirect(`/#!/password/reset/${req.params.token}`);
	});
};

/**
 * Reset password POST from email token
 */
exports.reset = (req, res, next) => {
	// Init Variables
	const passwordDetails = req.body;

	async.waterfall([

		done => {
			User.findOne({
				resetPasswordToken: req.params.token,
				resetPasswordExpires: {
					$gt: Date.now()
				}
			}, (err, user) => {
				if (!err && user) {
					if (passwordDetails.newPassword === passwordDetails.verifyPassword) {
						user.password = passwordDetails.newPassword;
						user.resetPasswordToken = undefined;
						user.resetPasswordExpires = undefined;
						// Explicitly hash user's password prior to saving
						user.hashPassword();
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
										// Return authenticated user 
										res.json(user);

										done(err, user);
									}
								});
							}
						});
					} else {
						return res.status(400).send({
							message: 'Passwords do not match'
						});
					}
				} else {
					return res.status(400).send({
						message: 'Password reset token is invalid or has expired.'
					});
				}
			});
		},
		(user, done) => {
			res.render('templates/reset-password-confirm-email', {
				name: user.displayName,
				appName: config.app.title
			}, (err, emailHTML) => {
				done(err, emailHTML, user);
			});
		},
		(emailHTML, user, done) => {
			const smtpTransport = nodemailer.createTransport(config.mailer.options);
			const mailOptions = {
				to: user.email,
				from: config.mailer.from,
				subject: 'Your password has been changed',
				html: emailHTML
			};

			smtpTransport.sendMail(mailOptions, err => {
				done(err, 'done');
			});
		}
	], err => {
		if (err) return next(err);
	});
};

/**
 * Change Password
 */
exports.changePassword = (req, res) => {
	// Init Variables
	const passwordDetails = req.body;

	if (req.user) {
		if (passwordDetails.newPassword) {
			User.findById(req.user.id, (err, user) => {
				if (!err && user) {
					if (user.authenticate(passwordDetails.currentPassword)) {
						if (passwordDetails.newPassword === passwordDetails.verifyPassword) {
							user.password = passwordDetails.newPassword;
							// Explicitly hash user's password prior to saving
							user.hashPassword();
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
											res.send({
												message: 'Password changed successfully'
											});
										}
									});
								}
							});
						} else {
							res.status(400).send({
								message: 'Passwords do not match'
							});
						}
					} else {
						res.status(400).send({
							message: 'Current password is incorrect'
						});
					}
				} else {
					res.status(400).send({
						message: 'User is not found'
					});
				}
			});
		} else {
			res.status(400).send({
				message: 'Please provide a new password'
			});
		}
	} else {
		res.status(400).send({
			message: 'User is not signed in'
		});
	}
};