/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	errorHandler = require('../errors.server.controller.js'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	User = mongoose.model('User'),
	Organization = mongoose.model('Organization'),
	auth = require('@cliques/cliques-node-utils').google.auth,
	gcloud = require('gcloud');

var AUTHFILE = auth.DEFAULT_JWT_SECRETS_FILE;
var PROJECT_ID = 'mimetic-codex-781';
var BUCKET = 'cliquesads-console-avatars-us';
var BASE_URL = 'https://storage.googleapis.com/'+BUCKET+'/';

/**
 * Handles upload of logo to Google Cloud Storage.
 *
 * Uploads to gcloud storage, makes file public and then returns
 * public URL.
 */
exports.createAvatar = function(req, res) {
	var client = gcloud({
		projectId: PROJECT_ID,
		keyFilename: AUTHFILE
	}).storage();
	var assets_bucket = client.bucket(BUCKET);
	var object_path = req.file.filename;
	var options = {
		destination: object_path,
		resumable: true,
		validation: 'crc32c',
		metadata: {
			userId: req.user.id
		}
	};
	assets_bucket.upload(req.file.path, options, function(err, file){
		if (err) {
			console.log(err);
			return res.status(404).send({
				message: errorHandler.getAndLogErrorMessage(err)
			});
		} else {
			// make file public and get public facing URL
			file.makePublic(function(err, apiResponse){
				if (err) return res.status(404).send({
					message: errorHandler.getAndLogErrorMessage(err)
				});
				// construct public URL of newly-uploaded asset
				// to return to client in apiResponse
				// Not sure if it's necessary to include full apiResponse
				// but it can't hurt
				apiResponse.url  = BASE_URL + object_path;
				return res.json(apiResponse);
			});
		}
	});
};


/**
 * Update user details
 */
exports.update = function(req, res) {
	// Init Variables
	var user = req.user;
	var message = null;

	// For security measurement we remove the roles from the req.body object
	delete req.body.roles;

	if (user) {
		// Merge existing user
		user = _.extend(user, req.body);
		user.updated = Date.now();
		user.displayName = user.firstName + ' ' + user.lastName;
		// Don't need to hash password here since passwords shouldn't be getting changed through this method
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
	} else {
		res.status(400).send({
			message: 'User is not signed in'
		});
	}
};

/**
 * Send User
 */
exports.me = function(req, res) {
	res.json(req.user || null);
};