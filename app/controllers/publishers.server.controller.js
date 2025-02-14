/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('@cliques/cliques-node-utils'),
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
var cloaderURLSecure = config.get('Static.CLoader.https');
var cloaderURLNonSecure = config.get('Static.CLoader.http');

var mailer = new mail.Mailer();

module.exports = function(db) {
    var publisherModels = new models.PublisherModels(db);
    var cliqueModels = new models.CliquesModels(db);

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
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                req.query.organization = req.user.organization.id;
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
            publisher.organization = req.user.organization;
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
                        if (process.env.NODE_ENV === 'production') {
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
                        }
                    });
                }
            });
        },
        /**
         * Delete a publisher
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
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                if (req.publisher.organization != req.user.organization.id){
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
            },
            /**
             * Gets all sites in request Clique, plus all sites in child Cliques
             * @param req
             * @param res
             */
            getSitesInCliqueBranch: function(req, res){
                var sites = [];
                var cliqueId = req.param('cliqueId');
                cliqueModels.Clique.find({ ancestors: cliqueId }, function(err, cliques) {
                    var ids = _.map(cliques, function (clique) {
                        return clique._id;
                    });
                    ids.push(cliqueId);
                    // Only get active sites in branch
                    var query = {"sites.clique": {$in: ids}, "sites.active": true };
                    publisherModels.Publisher.find(query,function (err, pubs) {
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        } else {
                            pubs.forEach(function (pub) {
                                // Create shell publisher object w/ base model properties
                                // to pass to site for client-side use
                                var pubAttrs = {};
                                var pubObj = pub.toObject();
                                Object.keys(pubObj).forEach(function(key){
                                    if (pubObj.hasOwnProperty(key) && key !== 'sites'){
                                        pubAttrs[key] = pubObj[key];
                                    }
                                });
                                var sitesInClique = pub.sites.filter(function (site) {
                                    return ids.indexOf(site.clique) > -1;
                                });
                                // augment each site with 'parent_publisher' property, which
                                // contains base model properties of publisher
                                sitesInClique = sitesInClique.map(function(site){
                                    var newSite = site.toObject();
                                    newSite.parent_publisher = pubAttrs;
                                    return newSite;
                                });
                                sites = sites.concat(sitesInClique);
                            });
                            sites = _.groupBy(sites, function(site){return site.clique;});
                            // Restructure a tad to make more friendly for client-side tree utils
                            var tree = [];
                            Object.keys(sites).forEach(function(clique){
                                if (sites.hasOwnProperty(clique)){
                                    tree.push({
                                        _id: clique,
                                        name: clique,
                                        sites: sites[clique]
                                    });
                                }
                            });
                            res.json(tree);
                        }
                    });
                });
            }
        },

        placement: {
            getTag: function (req, res) {
                var secure = JSON.parse(req.query.secure);
                var cloaderURL = secure ? cloaderURLSecure : cloaderURLNonSecure;
                var tag = new tags.PubTag(exchangeHostname,{
                    secure_hostname: exchangeSecureHostname,
                    port: exchangePort,
                    secure: secure,
                    cloaderURL: cloaderURL,
                    keywords: req.query.keywords,
                    tag_type: req.query.type,
                    targetId: req.query.targetId,
                    external: JSON.parse(req.query.externalTest) ? { test: true } : false,
                    targetChildIndex: req.query.targetChildIndex,
                    useFactory: JSON.parse(req.query.useFactory),
                    locationId: JSON.parse(req.query.locationId)
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
