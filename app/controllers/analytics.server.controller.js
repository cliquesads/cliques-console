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
				var newQuery = new Query(req.body);
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
						return res.json({
							id: newQuery._id
						});
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
                req.query.user = req.user.id;
                req.query.per_page = req.query.per_page || String(ITEMS_PER_PAGE);
				Query.apiQuery(req.query, function(err, queries) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    }
                    // TODO: Standardize how pagination is handled across API
                    return res.json(queries);
                });
			}
		}
	};
};