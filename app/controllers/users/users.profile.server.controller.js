/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
const _ = require('lodash'), errorHandler = require('../errors.server.controller.js'), mongoose = require('mongoose'), passport = require('passport'), User = mongoose.model('User'), Organization = mongoose.model('Organization'), auth = require('@cliques/cliques-node-utils').google.auth, gcloud = require('google-cloud');

const AUTHFILE = auth.DEFAULT_JWT_SECRETS_FILE;
const PROJECT_ID = 'mimetic-codex-781';
const BUCKET = 'cliquesads-console-avatars-us';
const BASE_URL = `https://storage.googleapis.com/${BUCKET}/`;

/**
 * Handles upload of logo to Google Cloud Storage.
 *
 * Uploads to gcloud storage, makes file public and then returns
 * public URL.
 */
exports.createAvatar = (req, res) => {
	const client = gcloud({
		projectId: PROJECT_ID,
		keyFilename: AUTHFILE
	}).storage();
	const assets_bucket = client.bucket(BUCKET);
	const object_path = req.file.filename;
	const options = {
		destination: object_path,
		resumable: true,
		validation: 'crc32c',
		metadata: {
			userId: req.user.id
		}
	};
	assets_bucket.upload(req.file.path, options, (err, file) => {
		if (err) {
			console.log(err);
			return res.status(404).send({
				message: errorHandler.getAndLogErrorMessage(err)
			});
		} else {
			// make file public and get public facing URL
			file.makePublic((err, apiResponse) => {
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
exports.update = (req, res) => {
	// Init Variables
	let user = req.user;
	const message = null;

	// For security measurement we remove the roles from the req.body object
	delete req.body.roles;

	if (user) {
		// Merge existing user
		user = _.extend(user, req.body);
		user.updated = Date.now();
		user.displayName = `${user.firstName} ${user.lastName}`;
		// Don't need to hash password here since passwords shouldn't be getting changed through this method
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
exports.me = (req, res) => {
	res.json(req.user || null);
};