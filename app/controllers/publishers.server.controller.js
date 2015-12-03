/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('cliques_node_utils'),
    models = node_utils.mongodb.models,
    mongoose = require('mongoose'),
    tags = node_utils.tags,
    mail = require('./mailer.server.controller'),
    errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

// Global vars to render action beacon tags
var config = require('config');
var exchangeHostname = config.get('Exchange.http.external.hostname');
var exchangeSecureHostname = config.get('Exchange.https.external.hostname');
var exchangePort = config.get('Exchange.http.external.port');

var mailer = new mail.Mailer();

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
            publisherModels.Publisher.find(req.query, function (err, publishers) {
                if (err) {
                    console.log(err);
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
            publisher.user = [req.user];
            publisher.save(function (err) {
                if (err) {
                    console.log(err);
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
                        if (process.env.NODE_ENV === 'production'){
                            mailer.sendMailFromUser('New Publisher & Site Created',
                                'new-publisher-email.server.view.html',
                                { publisher: pub, user: req.user },
                                req.user,
                                'support@cliquesads.com'
                            );
                        }
                    });
                }
            });
        },
        ///**
        // * Get or create publisher, updating w/ body if exists
        // */
        //updateOrCreate: function (req, res) {
        //    publisherModels.Publisher.findOneAndUpdate({'name': req.body.name},
        //        req.body,
        //        {'upsert': true},
        //        function (err, publisher) {
        //            console.log(err);
        //            if (err) {
        //                return res.status(400).send({
        //                    message: errorHandler.getAndLogErrorMessage(err)
        //                });
        //            } else {
        //                publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, pub){
        //                    if (err) {
        //                        return res.status(400).send({
        //                            message: errorHandler.getAndLogErrorMessage(err)
        //                        });
        //                    }
        //                    res.status(200).json(pub).send();
        //                });
        //            }
        //        }
        //    );
        //},
        /**
         * Update existing publisher
         */
        update: function (req, res) {
            // Capture initial publisher state to diff against new.
            // Use this to determine whether to call email hooks or not.
            var publisher = req.publisher,
                initSites = req.publisher.sites,
                initPages = _.reduce(initSites, function(result, site){ return result.concat(site.pages); }, []),
                initPlacements = _.reduce(initPages, function(result, page){ return result.concat(page.placements); }, []);

            // Now extend with request body
            publisher = _.extend(publisher, req.body);
            publisher.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    publisherModels.Publisher.populate(publisher, {path: 'user'}, function(err, pub) {
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.status(200).json(pub).send();

                        // ============== EMAIL HOOKS ==============//
                        //if (process.env.NODE_ENV === 'production') {
                            var newSites = pub.sites,
                                newPages = _.reduce(newSites, function (result, site) {return result.concat(site.pages);}, []),
                                newPlacements = _.reduce(newPages, function (result, page) { return result.concat(page.placements); }, []);
                            // Send internal email notifying of new campaign, if any
                            if (newSites.length > initSites.length) {
                                var sitesCreated = _.difference(newSites, initSites);
                                mailer.sendMailFromUser('New Site(s) Created','new-sites-email.server.view.html',{publisher: pub, user: req.user, sites: sitesCreated},req.user,'support@cliquesads.com');
                            } else if (newPages.length > initPages.length) {
                                var pagesCreated = _.difference(newPages, initPages);
                                mailer.sendMailFromUser('New Page(s) Created','new-pages-email.server.view.html',{publisher: pub, user: req.user, pages: pagesCreated},req.user,'support@cliquesads.com');
                            } else if (newPlacements.length > initPlacements.length) {
                                var placementsCreated = _.difference(newPlacements, initPlacements);
                                mailer.sendMailFromUser('New Placement(s) Created','new-placements-email.server.view.html',{publisher: pub, user: req.user, placements: placementsCreated},req.user,'support@cliquesads.com');
                            }
                        //}
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
                    console.log(err);
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
                if (req.publisher.user.filter(function(u){return u.id == req.user.id;}).length === 0){
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
