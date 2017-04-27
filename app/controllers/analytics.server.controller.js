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

var ITEMS_PER_PAGE = 25;

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
	var geoModels = new models.GeoModels(db);
	advertiserModels.Advertiser.promisifiedFind = promise.promisify(advertiserModels.Advertiser.find);
	publisherModels.Publisher.promisifiedFind = promise.promisify(publisherModels.Publisher.find);

	return {
		query: {
            /**
             * Query middleware
             */
            queryByID: function (req, res, next, id) {
                Query.findById(id)
                    .exec(function (err, query) {
                        if (err) return next(err);
                        if (!query) return next(new Error('Failed to load query' + id));
                        req.query = query;
                        next();
                    });
            },

            read: function(req, res){
                return res.json(req.query);
            },

			/**
			 * Create new query
			 */
			create: function(req, res) {
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
			 * Update query with object in request body
			 */
			update: function(req, res) {
                var query = req.query;
                query = _.extend(query, req.body);
				Query.save(function(err) {
					if (err) {
						return res.status(400).send({ message: err });
					}
					res.json(query);
				});
			},

			/**
			 * Get recent quick queries for current user
			 */
			getMany: function (req, res) {
                req.query.user = req.user._id;
                req.query.itemsPerPage = ITEMS_PER_PAGE;
				Query.apiQuery(req.query, function(err, queries) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    }
                    Query.count(req.query)
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
			 * Get recent queries saved by current user
			 */
			getMyQueries: function (req, res) {
				var currentPage = req.query.currentPage;
				var queryParam = {
					user: req.user._id,
					isSaved: true
				};
				Query.find(queryParam)
					.sort({
						createdAt: -1
					})
					.skip((currentPage - 1) * ITEMS_PER_PAGE)
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
			}
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
		},
		/**
		 * Get all countries from database
		 */
		getAllCountries: function(req, res) {
			geoModels.Country.find({}, function(err, countries) {
				if (err) {
					return res.status(400).send({
						message: 'Error getting countries'
					});
				} else {
					return res.json(countries);
				}
			});
		},
		/**
		 * Get regions for specific country
		 */
		getRegions: function(req, res) {
			var country = req.param('country');
			geoModels.Region.find({
				country: country
			}, function(err, regions) {
				if (err) {
					return res.status(400).send({
						message: 'Error getting region for country ' + country
					});
				} else {
					return res.json(regions);
				}
			});
		}
	};
};