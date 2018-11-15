/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var node_utils = require('@cliques/cliques-node-utils'),
    promise = require('bluebird'),
    models = node_utils.mongodb.models,
    mongoose = require('mongoose'),
    tags = node_utils.tags,
	errorHandler = require('./errors.server.controller'),
    mail = require('./mailer.server.controller'),
    BidderPubSub = node_utils.google.pubsub.BidderPubSub,
    AccessCode = mongoose.model('AccessCode'),
    util = require('util'),
	_ = require('lodash');


mongoose.Promise = promise;

if (process.env.NODE_ENV !== 'production'){
    var pubsub_options = {
        projectId: 'mimetic-codex-781',
        test: true
    };
} else {
    pubsub_options = {projectId: 'mimetic-codex-781'};
}
var service = new BidderPubSub(pubsub_options);
var mailer = new mail.Mailer();

// Global vars to render action beacon tags
var config = require('config');
var adserverHostname = config.get('AdServer.http.external.hostname');
var adserverPort = config.get('AdServer.http.external.port');
var adserverSecureHostname = config.get('AdServer.https.external.hostname');
var adserverSecurePort = config.get('AdServer.https.external.port');

// This method is mostly just to handle redundant error logic.  I don't
// want to bind this to middleware because draftId is fairly ambiguous
var _getDraftById = function(req, callback){
    var sess = req.session;
    var draftId = req.param('draftId');
    if (!sess.campaignDrafts){
        return callback({ message: 'No campaign drafts for this session'}, null);
    } else {
        var draft = _.find(sess.campaignDrafts, function(d){ return d.draftId === draftId; });
        if (!draft) {
            return callback({message: 'Draft ID ' + draftId + ' not found'});
        } else {
            return callback(null, draft);
        }
    }
};

var _getTreeEntitiesFromRequest = function(req){
    // Checks if campaign is active.  If not, publishes 'createBidder' message and sets campaign to active
    var advertiser = req.advertiser,
        campaignId = req.param('campaignId'),
        creativeGroupId = req.param('creativeGroupId'),
        creativeId = req.param('creativeId');
    // repetitive, I know.  Sorry.
    var campaign = advertiser.campaigns[_.findIndex(advertiser.campaigns, function (c) {
        return c._id.toString() === campaignId;
    })];
    var creativeGroup = campaign.creativegroups[_.findIndex(campaign.creativegroups, function (c) {
        return c._id.toString() === creativeGroupId;
    })];
    var creative = creativeGroup.creatives[_.findIndex(creativeGroup.creatives, function (c) {
        return c._id.toString() === creativeId;
    })];
    return {
        advertiser: advertiser,
        campaign: campaign,
        creativegroup: creativeGroup,
        creative: creative
    };
};

var _firstCampaignPromoHook = function(req){
    var accesscodeId = req.user.organization.accesscode;
    if (accesscodeId){
        AccessCode.findById(accesscodeId, function(err, accessCode){
            if (err) console.error('ERROR occurred when populating accesscode field for org: ' + err);
            // populate issuer orgs, if any
            var promoType = 'Campaign';
            accessCode.redeemIssuerPromos(promoType,function(err, results){
                if (err) console.error(err);
                // results is array of { user: <User>, promo: <Promo> } objects
                results.forEach(function(userPromo){
                    var subject = util.format('%s Has Created Their First Campaign',
                        req.user.organization.name);
                    if (userPromo.promo) subject = 'You\'ve Got Cash - ' + subject;
                    mailer.sendMail({
                        subject: subject,
                        templateName: 'accesscode-redeemed-email.server.view.html',
                        data: {
                            organization: req.user.organization,
                            promo: userPromo.promo,
                            accessCode: accessCode,
                            promoType: promoType },
                        to: userPromo.user.email,
                        fromAlias: 'Cliques'
                    });
                });
            });
        });
    }
};

module.exports = function(db) {
    var advertiserModels = new models.AdvertiserModels(db);
    var geoModels = new models.GeoModels(db);

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
            // Right now this is all advertisers in org
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                req.query.organization = req.user.organization.id;
            }
            advertiserModels.Advertiser.find(req.query, function (err, advertisers) {
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
            advertiser.user = [req.user];
            advertiser.organization = req.user.organization;

            advertiser.save(function (err) {
                if (err) {
                    console.log(err);
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
                        // Now send internal email notifying team of creation
                        if (process.env.NODE_ENV === 'production'){
                            mailer.sendMailFromUser('New Advertiser Created',
                                'new-advertiser-email.server.view.html',
                                { advertiser: advertiser, user: req.user },
                                req.user,
                                'support@cliquesads.com'
                            );
                        }
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
                        console.log(err);
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
         * Updates existing advertiser and performs a bunch of post-update operations
         *
         * 1) Extend advertiser with request body and saves
         * 2) If any new campaigns were created, returns these new campaigns in response as well as full advertiser
         * 3) Publish updateBidder message for existing campaigns
         * 4) Send internal email notifying admins of new campaigns that were created, if any
         */
        update: function (req, res) {
            var advertiser = req.advertiser;
            var initCampaigns = advertiser.campaigns;
            advertiser = _.extend(advertiser, req.body);
            advertiser.save(function (err) {
                if (err) {
                    console.log(err);
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
                        // now get new campaigns that were created
                        var newCampaigns = _.difference(adv.campaigns, initCampaigns);
                        res.json(adv);

                        // Now publish update message to bidders
                        // Only update bidders for existing campaigns, as new campaigns don't have
                        // active bidding agents yet.
                        //TODO: This is lazy, should figure out whether campaign has changed or not
                        initCampaigns.forEach(function(campaign){
                            service.publishers.updateBidder(campaign.id);
                        });

                        // Send internal email notifying of new campaign(s), if any
                        if (newCampaigns.length > 0){
                            //if (process.env.NODE_ENV === 'production'){
                                // send one email per campaign
                                newCampaigns.forEach(function(campaign){
                                    mailer.sendMailFromUser('New Campaign Created', 'new-campaign-email.server.view.html',
                                        {advertiser: advertiser, campaign: campaign, user: req.user},
                                        req.user,
                                        'support@cliquesads.com'
                                    );
                                });
                            //}

                            // Finally, call first campaign promo hook if necessary
                            // TODO: This assumes promo only issued on first campaign creation
                            if (_.isEmpty(initCampaigns)){
                                // also have to check if organization has any other advertisers.  Don't want to issue
                                // promo if org has another advertiser already
                                advertiserModels.Advertiser.find({ organization: req.user.organization._id, _id: { $ne: advertiser._id }}, function(err, res){
                                    if (err) console.error('ERROR when getting other advertisers for org: ' + err);
                                    if (_.isEmpty(res)){
                                        _firstCampaignPromoHook(req);
                                    }
                                });
                            }
                        }
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
                    console.log(err);
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
         * Advertiser authorization middleware
         */
        hasAuthorization: function (req, res, next) {
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                if (req.advertiser.organization != req.user.organization.id){
                    return res.status(403).send({
                        message: 'User is not authorized'
                    });
                }
            }
            next();
        },

        campaign: {
            getGeoTrees: function (req, res) {
                var advertiser = req.advertiser;
                var campaignId = req.param('campaignId');
                var targetOrBlock = req.param('targetOrBlock');
                var ind = _.findIndex(req.advertiser.campaigns, function(c) {
                    return c._id.toString() === campaignId;
                });
                var campaign = advertiser.campaigns[ind];

                var geoTrees = [];
                var wantedGeos;
                var wantedDmas;
                if (targetOrBlock === 'target') {
                    wantedGeos = campaign.geo_targets;
                    wantedDmas = campaign.dma_targets;
                } else if (targetOrBlock === 'block') {
                    wantedGeos = campaign.blocked_geos;
                    wantedDmas = campaign.blocked_dmas;
                } else if (targetOrBlock === 'targetOnly') {
                    wantedGeos = campaign.target_only_geos;
                    wantedDmas = campaign.target_only_dmas;
                }
                return promise.each(wantedGeos, function(country) {
                    var countryObj;
                    return geoModels.Country.findOne({_id: country.target})
                    .then(function(countryResult) {
                        countryObj = JSON.parse(JSON.stringify(countryResult));
                        countryObj.weight = country.weight;
                        countryObj.explicit = country.explicit;
                        if (country.children) {
                            countryObj.regions = [];
                            return promise.each(country.children, function(region) {
                                var regionObj;
                                var customizedCityIds = [];
                                return geoModels.Region.findOne({_id: region.target})
                                .then(function(regionResult) {
                                    regionObj = JSON.parse(JSON.stringify(regionResult));
                                    regionObj.weight = region.weight;
                                    regionObj.explicit = region.explicit;
                                    regionObj.cities = [];
                                    if (region.children) {
                                        return promise.each(region.children, function(city) {
                                            var cityObj;
                                            customizedCityIds.push(city.target);
                                            return geoModels.City.findOne({_id: city.target})
                                            .then(function(cityResult) {
                                                cityObj = JSON.parse(JSON.stringify(cityResult));
                                                cityObj.weight = city.weight;
                                                cityObj.explicit = city.explicit;
                                                regionObj.cities.push(cityObj);
                                            });
                                        });
                                    } else {
                                        return geoModels.City.count({region: regionObj._id})
                                            .then(function(numOfCities) {
                                               regionObj.numOfCities = numOfCities;
                                            });
                                    }
                                })
                                .then(function() {
                                    if (targetOrBlock === 'target'){
                                        // For each region, all those cities that haven't
                                        // been customized should also be loaded
                                        return geoModels.City.find({
                                            region: region.target,
                                            _id: {
                                                $nin: customizedCityIds
                                            }
                                        })
                                        .then(function(notCustomizedCities) {
                                            regionObj.cities = regionObj.cities.concat(notCustomizedCities);
                                        });
                                    }
                                })
                                .then(function() {
                                    countryObj.regions.push(regionObj);
                                });
                            });
                        }
                    })
                    .then(function() {
                        geoTrees.push(countryObj);
                    });
                })
                // Now populate DMAs
                .then(() => {
                    // first add DMA targets from dma_targets / blocked_dmas / target_only_dmas
                    if (wantedDmas && wantedDmas.length) {
                        let usaNode = _.find(geoTrees, function(country){
                            return country._id === 'USA';
                        });
                        // if USA isn't in geoTargeting tree, then need to manually add it as a placeholder for DMAs.
                        if (!usaNode) {
                            usaNode = { _id: "USA", name: "USA", explicit: false, weight: null };
                            geoTrees.push(usaNode);
                        }
                        usaNode.dmas = [];
                        // TODO: don't link how this makes individual DB calls for each target, should run a find() instead
                        // of findOne and not
                        return geoModels.DMA.find({_id: { $in: wantedDmas.map((target) => { return target.target; })}})
                            .then(function(dmaResults){
                                for (let dma of dmaResults){
                                    const dmaObj = JSON.parse(JSON.stringify(dma));
                                    const target = _.find(wantedDmas, t => { return t.target === dma._id; });
                                    dmaObj.weight = target.weight;
                                    dmaObj.explicit = target.explicit;
                                    usaNode.dmas.push(dmaObj);
                                }
                            });
                    }
                })
                .then(function() {
                    return res.json(geoTrees);
                })
                .catch(function(err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                });
            },
            //TODO: Campaign controllers here
            getCampaignsInClique: function (req, res) {
                var camps = [];
                var cliqueId = req.param('cliqueId');
                advertiserModels.Advertiser.find({"campaigns.clique": cliqueId}, function (err, advs) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        advs.forEach(function (adv) {
                            camps = camps.concat(adv.campaigns.filter(function (camp) {
                                return camp.clique === cliqueId;
                            }));
                        });
                        res.json(camps);
                    }
                });
            },
            activate: function (req, res) {
                // Checks if campaign is active.  If not, publishes 'createBidder' message and sets campaign to active
                var advertiser = req.advertiser;
                var campaignId = req.param('campaignId');
                var ind = _.findIndex(req.advertiser.campaigns, function (c) {
                    return c._id.toString() === campaignId;
                });
                var campaign = advertiser.campaigns[ind];
                if (!campaign) {
                    return res.status(404).send({
                        message: "Cannot find campaign ID " + campaignId + " in advertiser ID " + advertiser._id
                    });
                }
                if (campaign.active) {
                    return res.status(400).send({
                        message: "Campaign already active, cannot activate!"
                    });
                } else {
                    // Publish message to create new bidding agent
                    service.publishers.createBidder(campaignId, (err, messageIds) => {
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        // Now set to active and save
                        advertiser.campaigns[ind].active = true;

                        // Set pending to false, meaning that it is no longer pending activation
                        advertiser.campaigns[ind].pending= false;

                        advertiser.save(function (err) {
                            if (err) {
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            } else {
                                return res.status(200).send();
                            }
                        });
                    });
                }
            },

            deactivate: function (req, res) {
                // Checks if campaign is inactive.  If not, publishes 'stopBidder' message and sets campaign to inactive
                var advertiser = req.advertiser;
                var campaignId = req.param('campaignId');
                var ind = _.findIndex(req.advertiser.campaigns, function (c) {
                    return c._id.toString() === campaignId;
                });
                var campaign = advertiser.campaigns[ind];
                if (!campaign) {
                    return res.status(404).send({
                        message: "Cannot find campaign ID " + campaignId + " in advertiser ID " + advertiser._id
                    });
                }
                if (!campaign.active) {
                    return res.status(400).send({
                        message: "Campaign already inactive, cannot deactivate!"
                    });
                } else {
                    // Publish message to stop bidding agent
                    service.publishers.stopBidder(campaignId, (err, messageIds) => {
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        // Now set to active and save
                        advertiser.campaigns[ind].active = false;
                        advertiser.save(function (err) {
                            if (err) {
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            } else {
                                return res.status(200).send();
                            }
                        });
                    });

                }
            },
            /**
             * Methods to activate/deactivate creatives
             */
            creativeGroup: {
                /**
                 * Activates creative and checks to see if parent creativeGroup needs to be activated
                 * as well.  If so, publishers updateBidder message.
                 */
                creative: {
                    activate: function (req, res) {
                        var treeEntities = _getTreeEntitiesFromRequest(req);
                        var advertiser = treeEntities.advertiser,
                            campaign = treeEntities.campaign,
                            creativegroup = treeEntities.creativegroup,
                            creative = treeEntities.creative;

                        // handle creative not found
                        if (!creative){
                            return res.status(404).send({
                                message: "Cannot find creative ID " + creative._id + " in advertiser ID "
                                + advertiser._id
                            });
                        }
                        // handle when creative is already active
                        if (creative.active) {
                            return res.status(400).send({
                                message: "Creative is already active, cannot activate!"
                            });
                        } else {
                            var updateBidder = false;
                            creative.active = true;
                            // if parent creativeGroup is inactive, it needs to be reactivated as well,
                            // and bidder needs to be updated.
                            if (!creativegroup.active) {
                                creativegroup.active = true;
                                updateBidder = true;
                            }
                            advertiser.save(function (err) {
                                if (err) {
                                    return res.status(400).send({
                                        message: errorHandler.getAndLogErrorMessage(err)
                                    });
                                } else {
                                    // Now publish message to update bidding agent w/ new config,
                                    // picking up previously-inactive creative group
                                    if (updateBidder){
                                        service.publishers.updateBidder(campaign.id, (err, messageIds) => {
                                            if (err) {
                                                return res.status(400).send({
                                                    message: errorHandler.getAndLogErrorMessage(err)
                                                });
                                            }
                                            return res.status(200).send();
                                        });
                                    } else {
                                        return res.status(200).send();
                                    }

                                }
                            });
                        }
                    },
                    deactivate: function (req, res) {
                        const treeEntities = _getTreeEntitiesFromRequest(req);
                        const advertiser = treeEntities.advertiser,
                            campaign = treeEntities.campaign,
                            creativegroup = treeEntities.creativegroup,
                            creative = treeEntities.creative;

                        // handle creative not found
                        if (!creative){
                            return res.status(404).send({
                                message: "Cannot find creative ID " + creative._id + " in advertiser ID "
                                + advertiser._id
                            });
                        }
                        // handle when creative is already active
                        if (!creative.active) {
                            return res.status(400).send({
                                message: "Creative is already inactive, cannot deactivate!"
                            });
                        } else {
                            let updateBidder = false;
                            creative.active = false;
                            // if all other creatives in creativegroup are inactive, deactivate
                            // creativegroup as well, and update bidder
                            const allInactive = creativegroup.creatives.every((elem) => {
                                return !elem.active;
                            });
                            if (allInactive){
                                creativegroup.active = false;
                                // check if this would in turn cause all creative groups to be deactivated, in which
                                // case return an error preventing user from inadvertently deactivating all
                                // creative groups and wreaking havoc on the adserver & bidder
                                const allCrgsInactive = campaign.creativegroups.every((el) => { return !el.active; });
                                if (allCrgsInactive){
                                    return res.status(400).send({
                                        message: 'Campaign must have at least one active creative.'
                                    });
                                }
                                updateBidder = true;
                            }
                            advertiser.save(function (err) {
                                if (err) {
                                    return res.status(400).send({
                                        message: errorHandler.getAndLogErrorMessage(err)
                                    });
                                } else {
                                    // Now publish message to update bidding agent w/ new config,
                                    // picking up previously-inactive creative group
                                    if (updateBidder){
                                        service.publishers.updateBidder(campaign.id, (err, messageIds) => {
                                            if (err) {
                                                return res.status(400).send({
                                                    message: errorHandler.getAndLogErrorMessage(err)
                                                });
                                            }
                                            return res.status(200).send();
                                        });
                                    } else {
                                        return res.status(200).send();
                                    }

                                }
                            });
                        }
                    },
                    remove: function(req, res){
                        var treeEntities = _getTreeEntitiesFromRequest(req);
                        var advertiser = treeEntities.advertiser,
                            campaign = treeEntities.campaign,
                            creativegroup = treeEntities.creativegroup,
                            creative = treeEntities.creative;
                        creative.remove();

                        let updateBidder = false;

                        // if creativegroup is now empty, it needs to be removed as well
                        if (creativegroup.creatives.length === 0) {
                            creativegroup.remove();
                            updateBidder = true;
                        }

                        // if all other creatives in creativegroup are inactive, deactivate
                        // creativegroup as well, and update bidder
                        const allInactive = creativegroup.creatives.every((elem) => {
                            return !elem.active;
                        });

                        if (allInactive){
                            creativegroup.active = false;
                            updateBidder = true;
                            // check if this would in turn cause all creative groups to be deactivated, in which
                            // case return an error preventing user from inadvertently deactivating all
                            // creative groups and wreaking havoc on the adserver & bidder
                            const allCrgsInactive = campaign.creativegroups.every((el) => { return !el.active; });
                            if (allCrgsInactive){
                                return res.status(400).send({
                                    message: 'Campaign must have at least one active creative.'
                                });
                            }
                        }
                        advertiser.save(function (err) {
                            if (err) {
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            } else {
                                // update bidder if successful
                                if (updateBidder){
                                    service.publishers.updateBidder(campaign.id, (err, messageIds) => {
                                        if (err) {
                                            return res.status(400).send({
                                                message: errorHandler.getAndLogErrorMessage(err)
                                            });
                                        }
                                        // return updated Advertiser in response
                                        return res.json(advertiser);
                                    });
                                } else {
                                    return res.json(advertiser);
                                }

                            }
                        });
                    },
                    removeMany: function(req, res){
                        var advertiser = req.advertiser,
                            campaignId = req.param('campaignId');
                        var campaign = advertiser.campaigns[_.findIndex(advertiser.campaigns, function (c) {
                            return c._id.toString() === campaignId;
                        })];

                        var creatives = req.body.creatives;
                        if (!creatives){
                            return res.status(400).send({
                                message: "No creative ID's provided. " +
                                "You must provide an array of creative IDs to remove in request body `creatives` " +
                                "parameter."
                            });
                        }
                        let updateBidder = false;
                        creatives.forEach(function(cr){
                            // find creativeGroup containing this creative
                            var creativegroup = _.find(campaign.creativegroups, function (crg) {
                                return _.find(crg.creatives, function(creative){
                                    return creative.id === cr;
                                });
                            });
                            // now remove creative from creativeGroup
                            creativegroup.creatives.id(cr).remove();

                            // if all other creatives in creativegroup are inactive, deactivate
                            // creativegroup as well, and update bidder
                            const allInactive = creativegroup.creatives.every((elem) => {
                                return !elem.active;
                            });

                            if (allInactive) {
                                creativegroup.active = false;
                                updateBidder = true;
                            }

                            // if creativegroup is now empty, it needs to be removed as well
                            if (creativegroup.creatives.length === 0) {
                                creativegroup.remove();
                                // update bidder if creativeGroup has been removed
                                updateBidder = true;
                            }
                        });

                        // check if all creativeGroups are inactive, in which case return 400 & revert
                        const allCrgsInactive = campaign.creativegroups.every((el) => { return !el.active; });
                        if (allCrgsInactive){
                            return res.status(400).send({
                                message: 'Campaign must have at least one active creative.'
                            });
                        }

                        advertiser.save(function (err) {
                            if (err) {
                                return res.status(400).send({
                                    message: errorHandler.getAndLogErrorMessage(err)
                                });
                            } else {
                                // update bidder if successful
                                if (updateBidder){
                                    service.publishers.updateBidder(campaign.id, (err, messageIds) => {
                                        if (err) {
                                            return res.status(400).send({
                                                message: errorHandler.getAndLogErrorMessage(err)
                                            });
                                        }
                                        // return updated Advertiser in response
                                        return res.json(advertiser);
                                    });
                                } else {
                                    return res.json(advertiser);
                                }

                            }
                        });
                    }
                }
            },
            /**
             * Methods to handle campaign drafts saved to sessions
             *
             * Simple scheme
             */
            draft: {
                getAllInSession: function(req, res){
                    var sess = req.session;
                    if (sess.campaignDrafts){
                        return res.json(sess.campaignDrafts);
                    } else {
                        return res.json(null);
                    }
                },
                getForAdvertiser: function (req, res) {
                    var sess = req.session;
                    var advertiserId = req.advertiser.id;
                    if (sess.campaignDrafts){
                        var drafts = sess.campaignDrafts.filter(function(draft){ return draft.advertiserId === advertiserId; });
                        return res.json(drafts);
                    } else {
                        return res.json(null);
                    }
                },
                create: function (req, res) {
                    var draft = req.body;
                    if (!draft.advertiserId){
                        return res.status(400).send({
                            message: 'CampaignDraft must contain an advertiserId'
                        });
                    }
                    draft.tstamp = new Date();
                    var sess = req.session;
                    sess.campaignDrafts = sess.campaignDrafts || [];
                    // Give draft a Mongo-style ObjectId
                    draft.draftId = mongoose.Types.ObjectId();
                    sess.campaignDrafts.push(draft);
                    return res.json(draft);
                },
                read: function (req, res) {
                    _getDraftById(req, function(err, draft){
                        if (err) return res.status(404).send(err);
                        return res.json(draft);
                    });
                },
                update: function (req, res) {
                    _getDraftById(req, function(err, draft){
                        if (err) return res.status(404).send(err);
                        _.extend(draft, req.body);
                        // update timestamp
                        draft.tstamp = new Date();
                        return res.json(draft);
                    });
                },
                remove: function (req, res) {
                    var sess = req.session;
                    var draftId = req.param('draftId');
                    _getDraftById(req, function(err, draft){
                        if (err) return res.status(404).send(err);
                        _.remove(sess.campaignDrafts, function(d){ return d.draftId === draft.draftId; });
                        // clear campaignDrafts if empty
                        if (sess.campaignDrafts === []){
                            delete sess.campaignDrafts;
                        }
                        return res.json(draft);
                    });
                }
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
