/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('@cliques/cliques-node-utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

module.exports = function(db) {
    var cliqueModels = new models.CliquesModels(db);

    return {
        /**
         * Get a single clique
         */
        read: function (req, res) {
            res.json(req.clique);
        },
        /**
         * Gets arbitrary number of Cliques
         */
        getMany: function (req, res) {
            // TODO: Mongo 3.4.7 seems to have an issue passing limits as strings, but apiQuery (which isn't maintained)
            // TODO: Needs them passed as strings b/c it performs regex on them. So either need to patch apiQuery
            // TODO: or get rid of this functionality altogether.
            // this defaults to 10, kind of infuriating
            // req.query.per_page = 1000000;
            cliqueModels.Clique.apiQuery(req.query).populate('default_advertisers').exec(function (err, cliques) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
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
            // pass in _id as name, as passing _id directly in request body
            // messes up client-side resource class
            req.body._id = req.body.name;
            var clique = new cliqueModels.Clique(req.body);

            clique.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
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
                            message: errorHandler.getAndLogErrorMessage(err)
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
            var thisClique = _.extend(clique, req.body);
            thisClique.save(function (err, newClique) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    cliqueModels.Clique.populate(newClique, {path: 'default_advertisers'}, function(err, c) {
                        if (err){
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        return res.json(c);
                    });
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
                        message: errorHandler.getAndLogErrorMessage(err)
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
            cliqueModels.Clique.findById(id).populate('default_advertisers').exec(function (err, clique) {
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
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
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
