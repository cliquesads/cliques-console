/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('@cliques/cliques-node-utils').mongodb.models,
	mongoose = require('mongoose'),
	Query = mongoose.model('Query'),
	errorHandler = require('./errors.server.controller'),
	moment = require('moment-timezone');	

module.exports = function(db) {
	return {
		getRecentQueries: function (req, res) {
			var queryParam = {
				user: req.user._id
			};
			Query.find(queryParam)
			.sort({
				createdAt: -1
			})
			.limit(5)
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
		getCustomQueries: function (req, res) {
			var queryParam = {
				user: req.user._id,
				name: 'custom'
			};
			Query.find(queryParam)
			.sort({
				createdAt: -1
			})
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
	};
};