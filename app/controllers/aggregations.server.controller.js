'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

module.exports = function(db) {
    var aggregationModels = new models.AggregationModels(db);
    return {
        hourlyAdStat: {
            /**
             * Gets arbitrary number of Advertisers
             */
            getMany: function (req, res) {
                // limit scope of query to just those advertisers to which
                // user is permitted to see
                //if (req.user.roles.indexOf('admin') === -1){
                //    req.query.user = req.user.id
                //}
                aggregationModels.Advertiser.apiQuery(req.query, function (err, hourlyAdStats) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json(hourlyAdStats);
                    }
                });
            },

            /**
             * Article authorization middleware
             */
            hasAuthorization: function (req, res, next) {
                if (req.user.roles.indexOf('admin') === -1){
                    if (req.advertiser.user != req.user.id) {
                        return res.status(403).send({
                            message: 'User is not authorized'
                        });
                    }
                }
                next();
            }
        }
    };
};
