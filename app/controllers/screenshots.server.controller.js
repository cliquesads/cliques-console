/* jshint node: true */
'use strict';

/**
 * Module dependencies.
 */
const node_utils = require('@cliques/cliques-node-utils'),
	errorHandler = require('./errors.server.controller'),
	models = node_utils.mongodb.models,
    config = require('config'),
    util = require('util'),
    mail = require('./mailer.server.controller'),
    promise = require('bluebird');

const mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });

module.exports = db => {
	const screenshotModels = new models.ScreenshotModels(db);
    const advertiserModels = new models.AdvertiserModels(db);
    const publisherModels = new models.PublisherModels(db);

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
				.exec((err, screenshot) => {
					if (err) return next(err);
					if (!screenshot) return next(new Error(`Failed to load screenshot ${id}`));
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
				const ss = req.screenshot;
				const org = req.user.organization.id;
				const isAuthorized = ss.advertiser.organization === org || ss.publisher === org;
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
			const comment = req.body.comment;
            const subject = util.format("%s Has Reported a Screenshot",
                req.user.displayName);
            mailer.sendMailFromUser(subject, 'report-screenshot-email.server.view.html',
                { user: req.user, comment: comment, screenshot: req.screenshot },
                req.user,
                'support@cliquesads.com',
                (err, success) => {
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
			const filter = {
				campaigns: [],
				sites: []
			};
			if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
				req.query.organization = req.user.organization.id;
			}
			if (req.user.organization.effectiveOrgType === 'advertiser' || req.user.organization.effectiveOrgType === 'networkAdmin') {
				advertiserModels.Advertiser.promisifiedFind = promise.promisify(advertiserModels.Advertiser.find);
				advertiserModels.Advertiser.promisifiedFind(req.query)
				.then(advertisers => {
					// Get all possible campaigns based on queried advertisers
					const advertiserIds = [];
					for (let i = 0; i < advertisers.length; i ++) {
						advertiserIds.push(advertisers[i]._id);
						for (let j = 0; j < advertisers[i].campaigns.length; j ++) {
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
				.then(screenshots => {
					const siteIds = [];
					for (let i = 0; i < screenshots.length; i ++) {
						if (siteIds.indexOf(`${screenshots[i].site}`) === -1) {
							siteIds.push(`${screenshots[i].site}`);
						}
					}
					publisherModels.promisifiedGetNestedObjectById = promise.promisify(publisherModels.getNestedObjectById);
					return promise.each(siteIds, siteId => publisherModels.promisifiedGetNestedObjectById(siteId, 'Site')
                    .then(foundSite => {
                        filter.sites.push({
                            name: foundSite.name,
                            id: foundSite._id
                        });
                    }));
				})
				.then(() => res.json(filter))
				.catch(err => res.status(400).send({
                    message: 'Error getting screenshot filters'
                }));
			} else if (req.user.organization.effectiveOrgType === 'publisher') {
				publisherModels.Publisher.promisifiedFind = promise.promisify(publisherModels.Publisher.find);
				publisherModels.Publisher.promisifiedFind(req.query)
				.then(publishers => {
					// Get all possible sites based on queried publishers
					const publisherIds = [];
					for (let i = 0; i < publishers.length; i ++) {
						publisherIds.push(publishers[i]._id);
						for (let j = 0; j < publishers[i].sites.length; j ++) {
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
				.then(screenshots => {
					const campaignIds = [];
					for (let i = 0; i < screenshots.length; i ++) {
						if (campaignIds.indexOf(`${screenshots[i].campaign}`) === -1) {
							campaignIds.push(`${screenshots[i].campaign}`);
						}
					}
					advertiserModels.promisifiedGetNestedObjectById = promise.promisify(advertiserModels.getNestedObjectById);
					return promise.each(campaignIds, campaignId => advertiserModels.promisifiedGetNestedObjectById(campaignId, 'Campaign')
                    .then(foundCampaign => {
                        filter.campaigns.push({
                            name: foundCampaign.name,
                            id: foundCampaign._id
                        });
                    }));
				})
				.then(() => res.json(filter))
				.catch(err => res.status(400).send({
                    message: 'Error getting screenshot filters'
                }));


			} 
		},
		/**
		 * Get screenshots by advertiserId
		 */
		getMany: function (req, res) {
			const page = req.query.page;
			const filterCampaignId = req.query.filterCampaignId;
			const filterSiteId = req.query.filterSiteId;
			const itemsPerPage = 25;

			delete req.query.page;
			delete req.query.filterCampaignId;
			delete req.query.filterSiteId;

			if (filterCampaignId || filterSiteId) {
				const queryParams = {};
				if (filterCampaignId) {
					queryParams.campaign = filterCampaignId;
				}
				if (filterSiteId) {
					queryParams.site = filterSiteId;
				}

				// TODO: Standardize how pagination is handled across API
				screenshotModels.Screenshot.find(queryParams)
				.sort({tstamp: -1})
				.skip((page - 1) * itemsPerPage)
				.limit(itemsPerPage)
				.exec((err, screenshots) => {
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
					const advertiserIds = [];
					advertiserModels.Advertiser.find(req.query, (err, advertisers) => {
						if (err) {
							return res.status(400).send({
								message: errorHandler.getAndLogErrorMessage(err)
							});
						}
						for (let i = 0; i < advertisers.length; i ++) {
							advertiserIds.push(advertisers[i]._id);
						}
						screenshotModels.Screenshot.find({
							advertiser: { $in: advertiserIds }
						})
						.sort({tstamp: -1})
						.skip((page - 1) * itemsPerPage)
						.limit(itemsPerPage)
						.exec((err, screenshots) => {
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
					const publisherIds = [];
					publisherModels.Publisher.find(req.query, (err, publishers) => {
						if (err) {
							return res.status(400).send({
								message: errorHandler.getAndLogErrorMessage(err)
							});
						}
						for (let i = 0; i < publishers.length; i ++) {
							publisherIds.push(publishers[i]._id);
						}
						screenshotModels.Screenshot.find({
							publisher: { $in: publisherIds }
						})
						.sort({tstamp: -1})
						.skip((page - 1) * itemsPerPage)
						.limit(itemsPerPage)
						.exec((err, screenshots) => {
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