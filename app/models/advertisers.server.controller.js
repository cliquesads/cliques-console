'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');


module.exports = function(db) {
    var advertiserModels = new models.AdvertiserModels(db);

    return {
        /**
         * Get a single advertiser
         */
        read: function (req, res) {
            res.json(req.advertiser)
        },
        /**
         * Gets arbitrary number of Advertisers
         */
        getMany: function (req, res) {
            advertiserModels.Advertiser.apiQuery(req.query, function (err, advertisers) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(advertisers);
                }
            });
        },
        /**
         * Create new advertiser
         */
        create: function (req, res) {
            var advertiser = new advertiserModels.Advertiser(req.body);
            advertiser.user = req.user;

            advertiser.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(advertiser);
                }
            });
        },
        /**
         * Get or create advertiser, updating w/ body if exists
         */
        updateOrCreate: function (req, res) {
            advertiserModels.Advertiser.findOneAndUpdate({'name': req.body.name},
                req.body,
                {'upsert': true},
                function (err, advertiser) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getErrorMessage(err)
                        });
                    } else {
                        res.json(advertiser);
                    }
                }
            );
        },
        /**
         * Update existing advertiser
         */
        update: function (req, res) {
            var advertiser = req.advertiser;
            advertiser = _.extend(advertiser, req.body);
            advertiser.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(advertiser);
                }
            });
        },
        /**
         * Delete an advertiser
         */
        remove: function (req, res) {
            var advertiser = req.advertiser;
            advertiser.remove(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(advertiser);
                }
            });
        },

        /**
         * Advertiser middleware
         */
        advertiserByID: function (req, res, next, id) {
            advertiserModels.Advertiser.findById(id).exec(function (err, advertiser) {
                if (err) return next(err);
                if (!advertiser) return next(new Error('Failed to load advertiser' + id));
                req.advertiser = advertiser;
                next();
            });
        },

        /**
         * Article authorization middleware
         */
        hasAuthorization: function (req, res, next) {
            if (req.advertiser.user.id !== req.user.id) {
                return res.status(403).send({
                    message: 'User is not authorized'
                });
            }
            next();
        },

        campaign: {
            //TODO: Campaign controllers here
        }
    };
};
