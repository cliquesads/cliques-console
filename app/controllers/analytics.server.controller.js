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

module.exports = function(db) {
	var advertiserModels = new models.AdvertiserModels(db);
	var publisherModels = new models.PublisherModels(db);

	return {
		/**
		 * Get recent quick queries for current user
		 */
		getRecentQueries: function (req, res) {
			var currentPage = req.query.currentPage;
			var queryParam = {
				user: req.user._id
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
				name: 'custom'
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
		 * Get all creatives that belong to current user's organization
		 */
		getAllCreatives: function (req, res) {
			var organizationId = req.user.organization._id;
			var allCreatives = [];
			advertiserModels.Advertiser.promisifiedFind = promise.promisify(advertiserModels.Advertiser.find);
			advertiserModels.Advertiser.promisifiedFind({
				organization: organizationId
			})
			.then(function(advertisers) {
				// iterate through each advertiser
				advertisers.forEach(function(advertiser) {
					advertiser.campaigns.forEach(function(campaign) {
						campaign.creativegroups.forEach(function(creativegroup) {
							creativegroup.creatives.forEach(function(creative) {
								allCreatives.push(creative);	
							});
						});
					});
				});
				return res.json(allCreatives);
			})
			.catch(function(err) {
				return res.status(400).send({
					message: 'Error getting advertisers'
				});
			});
		},
		/**
		 * Get all sites that belong to current user's organization
		 */
		getAllSites: function (req, res) {
			var organizationId = req.user.organization._id;	
			var allSites = [];
			publisherModels.Publisher.promisifiedFind = promise.promisify(publisherModels.Publisher.find);
			publisherModels.Publisher.promisifiedFind({
				organization: organizationId
			})
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
		}
	};
};