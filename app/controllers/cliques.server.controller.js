'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

module.exports = function(db) {
    var cliqueModels = new models.CliquesModels(db);

    return {
        /**
         * Get a single clique
         */
        read: function (req, res) {
            res.json(req.clique)
        },
        /**
         * Gets arbitrary number of Cliques
         */
        getMany: function (req, res) {
            // this defaults to 10, kind of infuriating
            req.query.per_page = "1000000";
            cliqueModels.Clique.apiQuery(req.query, function (err, cliques) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(cliques);
                }
            });
        },
        /**
         * Create new clique
         */
        create: function (req, res) {
            var clique = new cliqueModels.Clique(req.body);

            clique.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(clique);
                }
            });
        },
        /**
         * Get or create clique, updating w/ body if exists
         */
        updateOrCreate: function (req, res) {
            cliqueModels.Clique.findOneAndUpdate({'_id': req.body._id },
                req.body,
                {'upsert': true},
                function (err, clique) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getErrorMessage(err)
                        });
                    } else {
                        res.json(clique);
                    }
                }
            );
        },
        /**
         * Update existing clique
         */
        update: function (req, res) {
            var clique = req.clique;
            clique = _.extend(clique, req.body);
            clique.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(clique);
                }
            });
        },
        /**
         * Delete an advertiser
         */
        remove: function (req, res) {
            var clique = req.clique;
            clique.remove(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(clique);
                }
            });
        },

        /**
         * Advertiser middleware
         */
        cliqueByID: function (req, res, next, id) {
            cliqueModels.Clique.findById(id).exec(function (err, clique) {
                if (err) return next(err);
                if (!clique) return next(new Error('Failed to load clique ' + id));
                req.clique = clique;
                next();
            });
        },

        /**
         * Authorization middleware
         *
         * Only let users get or modify
         */
        hasAuthorization: function (req, res, next) {
            if (req.user.roles.indexOf('admin') === -1){
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
