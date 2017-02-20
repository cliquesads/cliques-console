/* jshint node: true */
'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('@cliques/cliques-node-utils'),
	errorHandler = require('./errors.server.controller'),
	models = node_utils.mongodb.models,
	config = require('config');

module.exports = function(db) {
	var screenshotModels = new models.ScreenshotModels(db);
    var advertiserModels = new models.AdvertiserModels(db);
    var publisherModels = new models.PublisherModels(db);

	return {
		/**
		 * Get all possible campaigns and sites as screenshot filters
		 */
		getScreenshotFilters: function (req, res) {
			var filter = {
				campaigns: [],
				sites: []
			};
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
					for (var j = 0; j < advertisers[i].campaigns.length; j ++) {
						filter.campaigns.push({
							name: advertisers[i].campaigns[j].name,
							id: advertisers[i].campaigns[j]._id	
						});
					}
				}
				publisherModels.Publisher.find(req.query, function(err, publishers) {
					if (err) {
						return res.status(400).send({
							message: errorHandler.getAndLogErrorMessage(err)
						});
					}
					for (var i = 0; i < publishers.length; i ++) {
						for (var j = 0; j < publishers[i].sites.length; j ++) {
							filter.sites.push({
								name: publishers[i].sites[j].name,
								id: publishers[i].sites[j]._id
							})
						}
					}
					return res.json(filter);
				});
			});
		},
		/**
		 * Get screenshots by advertiserId
		 */
		getManyByAdvertisers: function (req, res) {
			var page = req.query.page;
			var filterCampaignId = req.query.filterCampaignId;
			var filterSiteId = req.query.filterSiteId;
			// var itemsPerPage = config.get('Screenshots.itemsPerPage');
			var itemsPerPage = 25;

			delete req.query.page;
			delete req.query.filterCampaignId;
			delete req.query.filterSiteId;

			if (filterCampaignId || filterSiteId) {
				var queryParams = {};
				if (filterCampaignId) {
					queryParams.campaign = filterCampaignId;
				}
				if (filterSiteId) {
					queryParams.site = filterSiteId;
				}
				screenshotModels.Screenshot.find(queryParams)
				.sort({tstamp: -1})
				.skip((page - 1) * itemsPerPage)
				.limit(itemsPerPage)
				.exec(function(err, screenshots) {
					if (err) {
						return res.status(400).send({
							message: errorHandler.getAndLogErrorMessage(err)
						});
					}
					return res.json({
						itemsPerPage: itemsPerPage,
						models: screenshots
					});
				});
			} else {
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
					})
					.sort({tstamp: -1})
					.skip((page - 1) * itemsPerPage)
					.limit(itemsPerPage)
					.exec(function(err, screenshots) {
						if (err) {
							return res.status(400).send({
								message: errorHandler.getAndLogErrorMessage(err)
							});
						}
						return res.json({
							itemsPerPage: itemsPerPage,
							models: screenshots
						});
					});
				});
			}
		},	

		/**
		 * Get screenshots by publisherId
		 */
		getManyByPublishers: function (req, res) {
			var page = req.query.page;
			var filterCampaignId = req.query.filterCampaignId;
			var filterSiteId = req.query.filterSiteId;
			// var itemsPerPage = config.get('Screenshots.itemsPerPage');
			var itemsPerPage = 25;
			
			delete req.query.page;
			delete req.query.filterCampaignId;
			delete req.query.filterSiteId;

			if (filterCampaignId || filterSiteId) {
				var queryParams = {};
				if (filterCampaignId) {
					queryParams.campaign = filterCampaignId;
				}
				if (filterSiteId) {
					queryParams.site = filterSiteId;
				}
				screenshotModels.Screenshot.find(queryParams)
				.sort({tstamp: -1})
				.skip((page - 1) * itemsPerPage)
				.limit(itemsPerPage)
				.exec(function(err, screenshots) {
					if (err) {
						return res.status(400).send({
							message: errorHandler.getAndLogErrorMessage(err)
						});
					}
					return res.json({
						itemsPerPage: itemsPerPage,
						models: screenshots
					});
				});
			} else {
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
					})
					.sort({tstamp: -1})
					.skip((page - 1) * itemsPerPage)
					.limit(itemsPerPage)
					.exec(function(err, screenshots) {
						if (err) {
							return res.status(400).send({
								message: errorHandler.getAndLogErrorMessage(err)
							});
						}
						return res.json({
							itemsPerPage: itemsPerPage,
							models: screenshots
						});
					});
				});
			}
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