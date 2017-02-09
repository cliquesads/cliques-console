/* jshint node: true */
'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('@cliques/cliques-node-utils'),
	models = node_utils.mongodb.models;

module.exports = function(db) {
	var screenshotModels = new models.ScreenshotModels(db);

	return {
		/**
		 * Get screenshots by advertiserId
		 */
		getManyByAdvertiserIds: function (req, res) {
			var advertiserIds = req.query.advertiserIds;
			try {
				advertiserIds = JSON.parse(advertiserIds);
			} catch(err) {
				var errorMessage = 'ERROR when parsing advertiserIds';
				console.error(errorMessage);
				return res.status(400).send({
					message: errorMessage
				});
			}
			screenshotModels.Screenshot.find({
				advertiser: { $in: advertiserIds }
			}, function(err, screenshots) {
				if (err) {
					var errorMessage = 'ERROR when getting screenshots with advertiserIds ';
					console.error(errorMessage + JSON.stringify(advertiserIds));
					return res.status(400).send({
						message: errorMessage
					});
				}
				return res.json(screenshots);
			});
		},	

		/**
		 * Get screenshots by publisherId
		 */
		getManyByPublisherIds: function (req, res) {
			var publisherIds = req.query.publisherIds;
			try {
				publisherIds = JSON.parse(publisherIds);
			} catch(err) {
				var errorMessage = 'ERROR when parsing publisherIds';
				console.error(errorMessage);
				return res.status(400).send({
					message: errorMessage
				});
			}
			screenshotModels.Screenshot.find({
				publisher: { $in: publisherIds }
			}, function(err, screenshots) {
				if (err) {
					var errorMessage = 'ERROR when getting screenshots with publisherIds ';
					console.error(errorMessage + JSON.stringify(publisherIds));
					return res.status(400).send({
						message: errorMessage
					});
				}
				return res.json(screenshots);
			});
		},

		/**
		 * Middleware to check if user organization types has advertiser
		 */
		hasAdvertiserType: function (req, res, next) {
			if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
				if (req.user.organization.organization_types.indexOf('advertiser') === -1) {
					return res.status(403).send({
						message: 'Organization is not an advertiser'
					});
				}
			}
			next();
		},

		/**
		 * Middleware to check if user organization types has publisher
		 */
		hasPublisherType: function (req, res, next) {
			if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
				if (req.user.organization.organization_types.indexOf('publisher') === -1) {
					return res.status(403).send({
						message: 'Organization is not a publisher'
					});
				}
			}
			next();
		}
	};
};