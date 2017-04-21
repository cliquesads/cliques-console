/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('@cliques/cliques-node-utils').mongodb.models,
	mongoose = require('mongoose'),
	Query = mongoose.model('Query'),
	errorHandler = require('./errors.server.controller'),
	moment = require('moment-timezone'),
	promise = require('bluebird');

var itemsPerPage = 25;

/**
 * Validates the schedule string before saving query model to database.
 *
 * A valid schedule string should have the following format:
 * '* * * * * *'
 * Each wildcard in order from left to right represents second, minute, hour, day of month, month and day of week respectively.
 */
var validateScheduleString = function(scheduleString) {
    var re = /^(\*\s|[1-5]{0,1}[0-9]\s){1,2}(\*\s|1{0,1}[0-9]\s|2[0-4]\s)(\*\s|[1-2]{0,1}[0-9]\s|3[0-1]\s)(\*\s|[1-9]\s|1[0-2]\s)(\*|[0-7]|1-5)$/;
    return re.test(scheduleString);
};

module.exports = function(db) {
	var advertiserModels = new models.AdvertiserModels(db);
	var publisherModels = new models.PublisherModels(db);
	advertiserModels.Advertiser.promisifiedFind = promise.promisify(advertiserModels.Advertiser.find);
	publisherModels.Publisher.promisifiedFind = promise.promisify(publisherModels.Publisher.find);

	return {
		/**
		 * Save query
		 */
		save: function(req, res) {
			var newQuery = new Query(req.body.queryParam);
			var scheduleString = newQuery.schedule;
			var nextRun;
			if (scheduleString) {
			    // validate schedule string
			    if (!validateScheduleString(scheduleString)) {
			        return res.status(400).send({
			            message: 'Illegal schedule string'
			        });
			    }
			    var parser = require('cron-parser');
			    var interval = parser.parseExpression(scheduleString);
			    nextRun = new Date(interval.next().toString());
			}
			newQuery.user = req.user._id;
			if (nextRun) {
			    // Save the next datetime this periodic query will be run
			    newQuery.nextRun = nextRun;
			}
			// If user is NOT networkAdmin, this query should be filtered by the user's advertisers/publishers
			if (!newQuery.filters) {
				newQuery.filters = [];	
			}
			return promise.resolve()
			.then(function() {
				if (req.user.organization.organization_types.indexOf('advertiser') !== -1) {
					return advertiserModels.Advertiser.promisifiedFind({
						organization: req.user.organization.id
					})
					.then(function(advertisers) {
						advertisers.forEach(function(advertiser) {
							newQuery.filters.push('advertiser' + advertiser._id);
						});
					});
				} else if (req.user.organization.organization_types.indexOf('publisher') !== -1) {
					return publisherModels.Publisher.promisifiedFind({
						organization: req.user.organization.id
					})
					.then(function(publishers) {
						publishers.forEach(function(publisher) {
							newQuery.filters.push('publisher' + publisher._id);
						});
					});
				} else {
					return promise.resolve();
				}
			})
			.then(function() {
				newQuery.promisifiedSave = promise.promisify(newQuery.save);
				return newQuery.promisifiedSave();
			}).then(function() {
				return res.send(newQuery._id);
			})
			.catch(function(err) {
				return res.status(400).send({ message: err });
			});
		},
		/**
		 * Save user selected additional query table headers
		 */
		saveAdditionalSelectedHeaders: function(req, res) {
			var selectedAdditionalHeaders = req.body.selectedAdditionalHeaders;
			var queryId = req.body.queryId;

			Query.findOne({
				_id: queryId
			}, function(err, query) {
				if (err) {
					return res.status(400).send({ message: err });
				}
				query.additionalHeaders = selectedAdditionalHeaders;
				query.save(function(err) {
					if (err) {
						return res.status(400).send({ message: err });
					}
					return res.send('');
				});
			});
		},
		/**
		 * Get recent quick queries for current user
		 */
		getRecentQueries: function (req, res) {
			var currentPage = req.query.currentPage;
			var queryParam = {
				user: req.user._id,
				type: { $ne: 'custom' }
			};
			Query.find(queryParam)
			.sort({
				createdAt: -1
			})
			.skip((currentPage - 1) * itemsPerPage)
			.limit(itemsPerPage)
			.exec(function(err, queries) {
				if (err) {
					return res.status(400).send({
						message: errorHandler.getAndLogErrorMessage(err)
					});
				}
				Query.count(queryParam)
				.exec(function(err, total) {
					if (err) {
						return res.status(400).send({

						});
					}
					return res.json({
						total: total,
						queries: queries
					});
				});
			});
		},
		/**
		 * Get recent custom queries for current user
		 */
		getCustomQueries: function (req, res) {
			var currentPage = req.query.currentPage;
			var queryParam = {
				user: req.user._id,
				type: 'custom'
			};
			Query.find(queryParam)
			.sort({
				createdAt: -1
			})
			.skip((currentPage - 1) * itemsPerPage)
			.limit(itemsPerPage)
			.exec(function(err, queries) {
				if (err) {
					return res.status(400).send({
						message: errorHandler.getAndLogErrorMessage(err)
					});
				}
				Query.count(queryParam)
				.exec(function(err, total) {
					if (err) {
						return res.status(400).send({
							message: errorHandler.getAndLogErrorMessage(err)
						});
					}
					return res.json({
						total: total,
						queries: queries
					});
				});
			});
		},
		/**
		 * Get all sites that belong to current user's organization
		 */
		getAllSites: function (req, res) {
			var allSites = [];

			var publisherQueryParam;
			// for networkAdmin, site filters should be all sites,
			// for advertiser/publisher, site filters should contain sites belong to the organization only
			if (req.user.organization.effectiveOrgType !== 'networkAdmin') {
				publisherQueryParam = {
					organization: req.user.organization._id
				};
			}

			publisherModels.Publisher.promisifiedFind(publisherQueryParam)
			.then(function(publishers) {
				// iterate through each publisher
				publishers.forEach(function(publisher) {
					publisher.sites.forEach(function(site) {
						allSites.push(site);
					});
				});
				return res.json(allSites);
			})
			.catch(function(err) {
				return res.status(400).send({
					message: 'Error getting publishers'
				});
			});
		},
		/**
		 * Get all campaigns that belong to current user's organization
		 */
		getAllCampaigns: function (req, res) {
			var allCampaigns = [];

			var advertiserQueryParam;
			// for networkAdmin, campaign filters should be all sites,
			// for advertiser/publisher, campaign filters should contain campaigns belong to the organization only
			if (req.user.organization.effectiveOrgType !== 'networkAdmin') {
				advertiserQueryParam = {
					organization: req.user.organization._id
				};
			}

			advertiserModels.Advertiser.promisifiedFind(advertiserQueryParam)
			.then(function(advertisers) {
				// iterate through each advertiser
				advertisers.forEach(function(advertiser) {
					advertiser.campaigns.forEach(function(campaign) {
						allCampaigns.push(campaign);
					});
				});
				return res.json(allCampaigns);
			})
			.catch(function(err) {
				return res.status(400).send({
					message: 'Error getting advertisers'
				});
			});
		}
	};
};