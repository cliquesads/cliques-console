/* jshint node: true */
'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('@cliques/cliques-node-utils'),
	errorHandler = require('./errors.server.controller'),
	models = node_utils.mongodb.models,
	config = require('config'),
    util = require('util'),
    mail = require('./mailer.server.controller'),
	promise = require('bluebird');

var mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });

module.exports = function(db) {
	var screenshotModels = new models.ScreenshotModels(db);
    var advertiserModels = new models.AdvertiserModels(db);
    var publisherModels = new models.PublisherModels(db);

	return {
		/**
		 * Get single screenshot by ID
		 * @param req
         * @param res
         */
		read: function(req, res){
			return res.json(req.screenshot);
		},

		/**
		 * Screenshot middleware
		 */
		screenshotByID: function (req, res, next, id) {
			screenshotModels.Screenshot
				.findById(id)
				.populate('advertiser publisher')
				.exec(function (err, screenshot) {
					if (err) return next(err);
					if (!screenshot) return next(new Error('Failed to load screenshot ' + id));
					req.screenshot = screenshot;
					next();
				});
		},

		/**
		 * Screenshot authorization middleware -- user has to either be a networkAdmin,
		 * or screenshot must belong to an advertiser or publisher under their organization.
		 */
		hasAuthorization: function (req, res, next) {
			if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
				var ss = req.screenshot;
				var org = req.user.organization.id;
				var isAuthorized = ss.advertiser.organization === org || ss.publisher === org;
				if (!isAuthorized){
					return res.status(403).send({
						message: 'User is not authorized'
					});
				}
			}
			next();
		},

		/**
		 * Handles reporting of screenshot by user, takes comments & context data & sends an email.
		 * @param req
		 * @param res
         * @param next
         */
		reportScreenshot: function(req, res, next){
			var comment = req.body.comment;
            var subject = util.format("%s Has Reported a Screenshot",
                req.user.displayName);
            mailer.sendMailFromUser(subject, 'report-screenshot-email.server.view.html',
                { user: req.user, comment: comment, screenshot: req.screenshot },
                req.user,
                'support@cliquesads.com',
                function(err, success){
                    if (err){
                        res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        return res.status(200).send();
                    }
                }
            );

		},

		/**
		 * Get all possible campaigns and sites as screenshot filters, the response filter
		 * has the following structure:
		 * {
		 *  	campaigns: [
		 *			{
		 *     			name: 'someCampaignName',
		 * 		   		id: ObjectId("someCampaignObjectId")
		 *     		},
		 *			...
		 *     	],
		 *		sites: [
		 *			{
		 *				name: 'someSiteName',
		 *				id: ObjectId("someSiteName")
		 *			},
		 * 			...
		 * 		]
		 * }
		 */
		getScreenshotFilters: function (req, res) {
			var filter = {
				campaigns: [],
				sites: []
			};
			if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
				req.query.organization = req.user.organization.id;
			}
			if (req.user.organization.effectiveOrgType === 'advertiser' || req.user.organization.effectiveOrgType === 'networkAdmin') {
				advertiserModels.Advertiser.promisifiedFind = promise.promisify(advertiserModels.Advertiser.find);
				advertiserModels.Advertiser.promisifiedFind(req.query)
				.then(function(advertisers) {
					// Get all possible campaigns based on queried advertisers
					var advertiserIds = [];
					for (var i = 0; i < advertisers.length; i ++) {
						advertiserIds.push(advertisers[i]._id);
						for (var j = 0; j < advertisers[i].campaigns.length; j ++) {
							filter.campaigns.push({
								name: advertisers[i].campaigns[j].name,
								id: advertisers[i].campaigns[j]._id	
							});
						}
					}
					screenshotModels.Screenshot.promisifiedFind = promise.promisify(screenshotModels.Screenshot.find);
					return screenshotModels.Screenshot.promisifiedFind({
						advertiser: { $in: advertiserIds }
					});
				})
				.then(function(screenshots) {
					var siteIds = [];
					for (var i = 0; i < screenshots.length; i ++) {
						if (siteIds.indexOf('' + screenshots[i].site) === -1) {
							siteIds.push('' + screenshots[i].site);
						}
					}
					publisherModels.promisifiedGetNestedObjectById = promise.promisify(publisherModels.getNestedObjectById);
					return promise.each(siteIds, function(siteId) {
						return publisherModels.promisifiedGetNestedObjectById(siteId, 'Site')
						.then(function(foundSite) {
							filter.sites.push({
								name: foundSite.name,
								id: foundSite._id
							});
						});
					});
				})
				.then(function() {
					return res.json(filter);	
				})
				.catch(function(err) {
					return res.status(400).send({
						message: 'Error getting screenshot filters'
					});
				});
			} else if (req.user.organization.effectiveOrgType === 'publisher') {
				publisherModels.Publisher.promisifiedFind = promise.promisify(publisherModels.Publisher.find);
				publisherModels.Publisher.promisifiedFind(req.query)
				.then(function(publishers) {
					// Get all possible sites based on queried publishers
					var publisherIds = [];
					for (var i = 0; i < publishers.length; i ++) {
						publisherIds.push(publishers[i]._id);
						for (var j = 0; j < publishers[i].sites.length; j ++) {
							filter.sites.push({
								name: publishers[i].sites[j].name,
								id: publishers[i].sites[j]._id	
							});
						}
					}
					screenshotModels.Screenshot.promisifiedFind = promise.promisify(screenshotModels.Screenshot.find);
					return screenshotModels.Screenshot.promisifiedFind({
						publisher: { $in: publisherIds }
					});
				})
				.then(function(screenshots) {
					var campaignIds = [];
					for (var i = 0; i < screenshots.length; i ++) {
						if (campaignIds.indexOf('' + screenshots[i].campaign) === -1) {
							campaignIds.push('' + screenshots[i].campaign);
						}
					}
					advertiserModels.promisifiedGetNestedObjectById = promise.promisify(advertiserModels.getNestedObjectById);
					return promise.each(campaignIds, function(campaignId) {
						return advertiserModels.promisifiedGetNestedObjectById(campaignId, 'Campaign')
						.then(function(foundCampaign) {
							filter.campaigns.push({
								name: foundCampaign.name,
								id: foundCampaign._id
							});
						});
					});
				})
				.then(function() {
					return res.json(filter);	
				})
				.catch(function(err) {
					return res.status(400).send({
						message: 'Error getting screenshot filters'
					});
				});


			} 
		},
		/**
		 * Get screenshots by advertiserId
		 */
		getMany: function (req, res) {
			var page = req.query.page;
			var filterCampaignId = req.query.filterCampaignId;
			var filterSiteId = req.query.filterSiteId;
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
				if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
					req.query.organization = req.user.organization.id;
				}
				if (req.user.organization.effectiveOrgType === 'advertiser' || req.user.organization.effectiveOrgType === 'networkAdmin') {
					var advertiserIds = [];
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
				} else {
					var publisherIds = [];
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
			}
		}
	};
};