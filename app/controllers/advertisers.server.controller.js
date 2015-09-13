/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('cliques_node_utils'),
    models = node_utils.mongodb.models,
    tags = node_utils.tags,
	errorHandler = require('./errors.server.controller'),
    BidderPubSub = node_utils.google.pubsub.BidderPubSub,
	_ = require('lodash');


if (process.env.NODE_ENV != 'production'){
    var pubsub_options = {
        projectId: 'mimetic-codex-781',
        test: true
    }
} else {
    pubsub_options = {projectId: 'mimetic-codex-781'};
}
var service = new BidderPubSub(pubsub_options);


// Global vars to render action beacon tags
var config = require('config');
var adserverHostname = config.get('AdServer.http.external.hostname');
var adserverPort = config.get('AdServer.http.external.port');
var adserverSecureHostname = config.get('AdServer.https.external.hostname');
var adserverSecurePort = config.get('AdServer.https.external.port');

module.exports = function(db) {
    var advertiserModels = new models.AdvertiserModels(db);

    return {
        /**
         * Get a single advertiser
         */
        read: function (req, res) {
            res.json(req.advertiser);
        },
        /**
         * Gets arbitrary number of Advertisers
         */
        getMany: function (req, res) {
            // limit scope of query to just those advertisers to which
            // user is permitted to see
            if (req.user.roles.indexOf('admin') === -1){
                req.query.user = req.user.id;
            }
            advertiserModels.Advertiser.apiQuery(req.query, function (err, advertisers) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
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
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, function(err, adv){
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
         * Get or create advertiser, updating w/ body if exists
         */
        updateOrCreate: function (req, res) {
            advertiserModels.Advertiser.findOneAndUpdate({'name': req.body.name},
                req.body,
                {'upsert': true},
                function (err, advertiser) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, function(err, adv){
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
         * Update existing advertiser
         */
        update: function (req, res) {
            var advertiser = req.advertiser;
            advertiser = _.extend(advertiser, req.body);
            advertiser.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, function(err, adv){
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        res.json(adv);
                        //TODO: This is lazy, should figure out whether campaign has changed or not
                        adv.campaigns.forEach(function(campaign){
                            service.publishers.updateBidder(campaign._id);
                        });
                    });

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
                        message: errorHandler.getAndLogErrorMessage(err)
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
            advertiserModels.Advertiser
                .findById(id)
                .populate('user')
                .exec(function (err, advertiser) {
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
            if (req.user.roles.indexOf('admin') === -1){
                if (req.advertiser.user.id != req.user.id) {
                    return res.status(403).send({
                        message: 'User is not authorized'
                    });
                }
            }
            next();
        },

        campaign: {
            //TODO: Campaign controllers here
            getCampaignsInClique: function(req, res){
                var camps = [];
                var cliqueId = req.param('cliqueId');
                advertiserModels.Advertiser.find({"campaigns.clique": cliqueId}, function(err, advs){
                    if (err){
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        advs.forEach(function(adv){
                            camps = camps.concat(adv.campaigns.filter(function(camp){ return camp.clique === cliqueId }));
                        });
                        res.json(camps);
                    }
                });
            }
        },
        actionbeacon: {
            getTag: function (req, res) {
                var secure = JSON.parse(req.query.secure);
                var tag = new tags.ActionBeaconTag(adserverHostname, {
                    port: secure ? adserverSecurePort : adserverPort,
                    secure: JSON.parse(req.query.secure),
                    secure_hostname: adserverSecureHostname
                });
                var actionbeaconId = req.param('actionbeaconId');
                var actionbeacon = _.find(req.advertiser.actionbeacons, function(b){ return b.id === actionbeaconId; });
                if (actionbeacon){
                    // Kind of a hack, but don't want to change render method
                    actionbeacon.parent_advertiser = {};
                    actionbeacon.parent_advertiser.id = req.advertiser.id;
                    var rendered = tag.render(actionbeacon);
                    res.json({tag: rendered});
                } else {
                    res.status(400).send({message: 'No actionbeacon with id ' + actionbeaconId + ' found under advertiser ID ' + req.advertiser.id});
                }
            }
        }
    };
};
