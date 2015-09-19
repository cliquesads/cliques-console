/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('cliques_node_utils'),
    models = node_utils.mongodb.models,
    tags = node_utils.tags,
    errorHandler = require('./errors.server.controller'),
	_ = require('lodash');


// Global vars to render action beacon tags
var config = require('config');
var exchangeHostname = config.get('Exchange.http.external.hostname');
var exchangeSecureHostname = config.get('Exchange.https.external.hostname');
var exchangePort = config.get('Exchange.http.external.port');

module.exports = function(db) {
    var publisherModels = new models.PublisherModels(db);

    return {
        /**
         * Get a single publisher
         */
        read: function (req, res) {
            res.json(req.publisher);
        },
        /**
         * Gets arbitrary number of Publishers
         */
        getMany: function (req, res) {
            // limit scope of query to just those publishers to which
            // user is permitted to see
            if (req.user.roles.indexOf('admin') === -1){
                req.query.user = req.user.id;
            }
            publisherModels.Publisher.apiQuery(req.query, function (err, publishers) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.json(publishers);
                }
            });
        },
        /**
         * Create new publisher
         */
        create: function (req, res) {
            var publisher = new publisherModels.Publisher(req.body);
            publisher.user = req.user;
            publisher.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, pub){
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.status(200).json(pub).send();
                    });
                }
            });
        },
        /**
         * Get or create publisher, updating w/ body if exists
         */
        updateOrCreate: function (req, res) {
            publisherModels.Publisher.findOneAndUpdate({'name': req.body.name},
                req.body,
                {'upsert': true},
                function (err, publisher) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, pub){
                            if (err) {
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            }
                            res.status(200).json(pub).send();
                        });
                    }
                }
            );
        },
        /**
         * Update existing publisher
         */
        update: function (req, res) {
            var publisher = req.publisher;
            publisher = _.extend(publisher, req.body);
            publisher.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, pub){
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.status(200).json(pub).send();
                    });
                }
            });
        },
        /**
         * Delete an publisher
         */
        remove: function (req, res) {
            var publisher = req.publisher;
            publisher.remove(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.status(200).json(publisher).send();
                }
            });
        },

        /**
         * Publisher middleware
         */
        publisherByID: function (req, res, next, id) {
            publisherModels.Publisher
                .findById(id)
                .populate('user')
                .exec(function (err, publisher) {
                    if (err) return next(err);
                    if (!publisher) return next(new Error('Failed to load publisher' + id));
                    req.publisher = publisher;
                    next();
                });
        },

        /**
         * Article authorization middleware
         */
        hasAuthorization: function (req, res, next) {
            if (req.user.roles.indexOf('admin') === -1){
                if (req.publisher.user.id != req.user.id) {
                    return res.status(403).send({
                        message: 'User is not authorized'
                    });
                }
            }
            next();
        },

        site: {
            getSitesInClique: function(req, res){
                var sites = [];
                var cliqueId = req.param('cliqueId');
                publisherModels.Publisher.find({"sites.clique": cliqueId}, function(err, pubs){
                    if (err){
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        pubs.forEach(function(pub){
                            sites = sites.concat(pub.sites.filter(function(site){ return site.clique === cliqueId; }));
                        });
                        res.json(sites);
                    }
                });
            }
        },

        placement: {
            getTag: function (req, res) {
                var tag = new tags.PubTag(exchangeHostname,{
                    secure_hostname: exchangeSecureHostname,
                    port: exchangePort,
                    secure: JSON.parse(req.query.secure)
                });
                publisherModels.getNestedObjectById(req.param('placementId'), 'Placement', function(err, placement){
                    if (err){
                        return res.status(400).send({message: 'Error looking up placement ID ' +
                        req.param('placementId') + ' ' + err});
                    }
                    var rendered = tag.render(placement);
                    return res.json({tag: rendered});
                });
            }
        }

    };
};
