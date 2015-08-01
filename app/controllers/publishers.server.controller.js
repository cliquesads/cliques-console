'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

module.exports = function(db) {
    var publisherModels = new models.PublisherModels(db);

    return {
        /**
         * Get a single publisher
         */
        read: function (req, res) {
            res.json(req.publisher)
        },
        /**
         * Gets arbitrary number of Publishers
         */
        getMany: function (req, res) {
            // limit scope of query to just those publishers to which
            // user is permitted to see
            if (req.user.roles.indexOf('admin') === -1){
                req.query.user = req.user.id
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
                    publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, adv){
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.json(adv);
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
                        publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, adv){
                            if (err) {
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            }
                            res.json(adv);
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
                    publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, adv){
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.json(adv);
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
                    res.json(publisher);
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
                if (req.publisher.user != req.user.id) {
                    return res.status(403).send({
                        message: 'User is not authorized'
                    });
                }
            }
            next();
        }
    };
};
