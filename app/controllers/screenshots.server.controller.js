/* jshint node: true */
'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('@cliques/cliques-node-utils'),
	errorHandler = require('./errors.server.controller'),
	models = node_utils.mongodb.models;

// This method creates a map that maps campaign name to the screenshots that belong to this campaign. The returned object has the following format:
// {
//		someCampaignName: [
//			screenshotDocument1,
// 			screenshotDocument2,
// 		],
//		anotherCampaignName: [
//			screenshotDocument3,
//			screenshotDocument4,
//		]
// }
var groupScreenshotsByCampaignName = function(screenshots) {
	var campaignScreenshots = {};
	for (var i = 0; i < screenshots.length; i ++) {
		if (!campaignScreenshots[screenshots[i].campaignName]) {
			campaignScreenshots[screenshots[i].campaignName] = [screenshots[i]];
		} else {
			campaignScreenshots[screenshots[i].campaignName].push(screenshots[i]);
		}
	}
	return campaignScreenshots;
};

module.exports = function(db) {
	var screenshotModels = new models.ScreenshotModels(db);
    var advertiserModels = new models.AdvertiserModels(db);
    var publisherModels = new models.PublisherModels(db);

	return {
		/**
		 * Get screenshots by advertiserId
		 */
		getManyByAdvertisers: function (req, res) {
			var shouldGroupByCampaign = req.query.groupByCampaign;
			req.query.groupByCampaign = null;
			var advertiserIds = [];

			if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
				req.query.organization = req.user.organization.id;
			}
			advertiserModels.Advertiser.find(req.query, function (err, advertisers) {
				if (err) {
					return res.status(400).send({
						message: errorHandler.getAndLogErrorMessage(err)
					});
				}
				for (var i = 0; i < advertisers.length; i ++) {
					advertiserIds.push(advertisers[i]._id);
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
					if (shouldGroupByCampaign) {
						return res.json(groupScreenshotsByCampaignName(screenshots));
					} else {
						return res.json(screenshots);
					}
				});
			});
		},	

		/**
		 * Get screenshots by publisherId
		 */
		getManyByPublishers: function (req, res) {
			var shouldGroupByCampaign = req.query.groupByCampaign;
			req.query.groupByCampaign = null;
			var publisherIds = [];

			if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
				req.query.organization = req.user.organization.id;
			}
			publisherModels.Publisher.find(req.query, function (err, publishers) {
				if (err) {
					return res.status(400).send({
						message: errorHandler.getAndLogErrorMessage(err)
					});
				}
				for (var i = 0; i < publishers.length; i ++) {
					publisherIds.push(publishers[i]._id);
				}
				screenshotModels.Screenshot.find({
					publisher: { $in: publisherIds }
				}, function(err, screenshots) {
					if (err) {
						var errorMessage = 'ERROR when getting screenshots with advertiserIds ';
						console.error(errorMessage + JSON.stringify(publisherIds));
						return res.status(400).send({
							message: errorMessage
						});
					}
					if (shouldGroupByCampaign) {
						return res.json(groupScreenshotsByCampaignName(screenshots));
					} else {
						return res.json(screenshots);
					}
				});
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