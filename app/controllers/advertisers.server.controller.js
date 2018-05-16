/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
const node_utils = require('@cliques/cliques-node-utils'),
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

let pubsub_options;
if (process.env.NODE_ENV !== 'production'){
    pubsub_options = {
        projectId: 'mimetic-codex-781',
        test: true
    };
} else {
    pubsub_options = {projectId: 'mimetic-codex-781'};
}
const service = new BidderPubSub(pubsub_options);
const mailer = new mail.Mailer();

// Global vars to render action beacon tags
const config = require('config');
const adserverHostname = config.get('AdServer.http.external.hostname');
const adserverPort = config.get('AdServer.http.external.port');
const adserverSecureHostname = config.get('AdServer.https.external.hostname');
const adserverSecurePort = config.get('AdServer.https.external.port');

// This method is mostly just to handle redundant error logic.  I don't
// want to bind this to middleware because draftId is fairly ambiguous
const _getDraftById = (req, callback) => {
    const sess = req.session;
    const draftId = req.param('draftId');
    if (!sess.campaignDrafts){
        return callback({ message: 'No campaign drafts for this session'}, null);
    } else {
        const draft = _.find(sess.campaignDrafts, d => d.draftId === draftId);
        if (!draft) {
            return callback({message: `Draft ID ${draftId} not found`});
        } else {
            return callback(null, draft);
        }
    }
};

const _getTreeEntitiesFromRequest = req => {
    // Checks if campaign is active.  If not, publishes 'createBidder' message and sets campaign to active
    const advertiser = req.advertiser, campaignId = req.param('campaignId'), creativeGroupId = req.param('creativeGroupId'), creativeId = req.param('creativeId');
    // repetitive, I know.  Sorry.
    const campaign = advertiser.campaigns[_.findIndex(advertiser.campaigns, c => c._id.toString() === campaignId)];
    const creativeGroup = campaign.creativegroups[_.findIndex(campaign.creativegroups, c => c._id.toString() === creativeGroupId)];
    const creative = creativeGroup.creatives[_.findIndex(creativeGroup.creatives, c => c._id.toString() === creativeId)];
    return {
        advertiser: advertiser,
        campaign: campaign,
        creativegroup: creativeGroup,
        creative: creative
    };
};

const _firstCampaignPromoHook = req => {
    const accesscodeId = req.user.organization.accesscode;
    if (accesscodeId){
        AccessCode.findById(accesscodeId, (err, accessCode) => {
            if (err) console.error(`ERROR occurred when populating accesscode field for org: ${err}`);
            // populate issuer orgs, if any
            const promoType = 'Campaign';
            accessCode.redeemIssuerPromos(promoType,(err, results) => {
                if (err) console.error(err);
                // results is array of { user: <User>, promo: <Promo> } objects
                results.forEach(userPromo => {
                    let subject = util.format('%s Has Created Their First Campaign',
                        req.user.organization.name);
                    if (userPromo.promo) subject = `You've Got Cash - ${subject}`;
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

module.exports = db => {
    const advertiserModels = new models.AdvertiserModels(db);
    const geoModels = new models.GeoModels(db);

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
            advertiserModels.Advertiser.find(req.query, (err, advertisers) => {
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
            const advertiser = new advertiserModels.Advertiser(req.body);
            advertiser.user = [req.user];
            advertiser.organization = req.user.organization;

            advertiser.save(err => {
                if (err) {
                    console.log(err);
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, (err, adv) => {
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
                (err, advertiser) => {
                    if (err) {
                        console.log(err);
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, (err, adv) => {
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
            let advertiser = req.advertiser;
            const initCampaigns = advertiser.campaigns;
            advertiser = _.extend(advertiser, req.body);
            advertiser.save(err => {
                if (err) {
                    console.log(err);
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    advertiserModels.Advertiser.populate(advertiser, {path: 'user'}, (err, adv) => {
                        if (err) {
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        // now get new campaigns that were created
                        const newCampaigns = _.difference(adv.campaigns, initCampaigns);
                        res.json(adv);

                        // Now publish update message to bidders
                        // Only update bidders for existing campaigns, as new campaigns don't have
                        // active bidding agents yet.
                        //TODO: This is lazy, should figure out whether campaign has changed or not
                        initCampaigns.forEach(campaign => {
                            service.publishers.updateBidder(campaign.id);
                        });

                        // Send internal email notifying of new campaign(s), if any
                        if (newCampaigns.length > 0){
                            //if (process.env.NODE_ENV === 'production'){
                                // send one email per campaign
                                newCampaigns.forEach(campaign => {
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
                                advertiserModels.Advertiser.find({ organization: req.user.organization._id, _id: { $ne: advertiser._id }}, (err, res) => {
                                    if (err) console.error(`ERROR when getting other advertisers for org: ${err}`);
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
            const advertiser = req.advertiser;
            advertiser.remove(err => {
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
                .exec((err, advertiser) => {
                    if (err) return next(err);
                    if (!advertiser) return next(new Error(`Failed to load advertiser${id}`));
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
                const advertiser = req.advertiser;
                const campaignId = req.param('campaignId');
                const targetOrBlock = req.param('targetOrBlock');
                const ind = _.findIndex(req.advertiser.campaigns, c => c._id.toString() === campaignId);
                const campaign = advertiser.campaigns[ind];

                const geoTrees = [];
                let wantedGeos;
                if (targetOrBlock === 'target') {
                    wantedGeos = campaign.geo_targets;
                } else if (targetOrBlock === 'block') {
                    wantedGeos = campaign.blocked_geos;
                }
                return promise.each(wantedGeos, country => {
                    let countryObj;
                    return geoModels.Country.findOne({_id: country.target})
                    .then(countryResult => {
                        countryObj = JSON.parse(JSON.stringify(countryResult));
                        countryObj.weight = country.weight;
                        countryObj.explicit = country.explicit;
                        if (country.children) {
                            countryObj.regions = [];
                            return promise.each(country.children, region => {
                                let regionObj;
                                const customizedCityIds = [];
                                return geoModels.Region.findOne({_id: region.target})
                                .then(regionResult => {
                                    regionObj = JSON.parse(JSON.stringify(regionResult));
                                    regionObj.weight = region.weight;
                                    regionObj.explicit = region.explicit;
                                    if (region.children) {
                                        regionObj.cities = [];
                                        return promise.each(region.children, city => {
                                            let cityObj;
                                            customizedCityIds.push(city.target);
                                            return geoModels.City.findOne({_id: city.target})
                                            .then(cityResult => {
                                                cityObj = JSON.parse(JSON.stringify(cityResult));
                                                cityObj.weight = city.weight;
                                                cityObj.explicit = city.explicit;
                                                regionObj.cities.push(cityObj);
                                            });
                                        });
                                    }
                                })
                                .then(() => // For each region, all those cities that haven't 
                                // been customized should also be loaded
                                geoModels.City.find({
                                    region: region.target,
                                    _id: {
                                        $nin: customizedCityIds
                                    }
                                })
                                .then(notCustomizedCities => {
                                    regionObj.cities = regionObj.cities.concat(notCustomizedCities);
                                }))
                                .then(() => {
                                    countryObj.regions.push(regionObj);
                                });
                            });
                        }
                    })
                    .then(() => {
                        geoTrees.push(countryObj);
                    });
                })
                .then(() => res.json(geoTrees))
                .catch(err => res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                }));
            },
            //TODO: Campaign controllers here
            getCampaignsInClique: function (req, res) {
                let camps = [];
                const cliqueId = req.param('cliqueId');
                advertiserModels.Advertiser.find({"campaigns.clique": cliqueId}, (err, advs) => {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        advs.forEach(adv => {
                            camps = camps.concat(adv.campaigns.filter(camp => camp.clique === cliqueId));
                        });
                        res.json(camps);
                    }
                });
            },
            activate: function (req, res) {
                // Checks if campaign is active.  If not, publishes 'createBidder' message and sets campaign to active
                const advertiser = req.advertiser;
                const campaignId = req.param('campaignId');
                const ind = _.findIndex(req.advertiser.campaigns, c => c._id.toString() === campaignId);
                const campaign = advertiser.campaigns[ind];
                if (!campaign) {
                    return res.status(404).send({
                        message: `Cannot find campaign ID ${campaignId} in advertiser ID ${advertiser._id}`
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
                        advertiser.save(err => {
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
                const advertiser = req.advertiser;
                const campaignId = req.param('campaignId');
                const ind = _.findIndex(req.advertiser.campaigns, c => c._id.toString() === campaignId);
                const campaign = advertiser.campaigns[ind];
                if (!campaign) {
                    return res.status(404).send({
                        message: `Cannot find campaign ID ${campaignId} in advertiser ID ${advertiser._id}`
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
                        advertiser.save(err => {
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
                        const treeEntities = _getTreeEntitiesFromRequest(req);
                        const advertiser = treeEntities.advertiser, campaign = treeEntities.campaign, creativegroup = treeEntities.creativegroup, creative = treeEntities.creative;

                        // handle creative not found
                        if (!creative){
                            return res.status(404).send({
                                message: `Cannot find creative ID ${creative._id} in advertiser ID ${advertiser._id}`
                            });
                        }
                        // handle when creative is already active
                        if (creative.active) {
                            return res.status(400).send({
                                message: "Creative is already active, cannot activate!"
                            });
                        } else {
                            let updateBidder = false;
                            creative.active = true;
                            // if parent creativeGroup is inactive, it needs to be reactivated as well,
                            // and bidder needs to be updated.
                            if (!creativegroup.active) {
                                creativegroup.active = true;
                                updateBidder = true;
                            }
                            advertiser.save(err => {
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
                                message: `Cannot find creative ID ${creative._id} in advertiser ID ${advertiser._id}`
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
                            advertiser.save(err => {
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
                        const treeEntities = _getTreeEntitiesFromRequest(req);
                        const advertiser = treeEntities.advertiser,
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
                        advertiser.save(err => {
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
                        const advertiser = req.advertiser, campaignId = req.param('campaignId');
                        const campaign = advertiser.campaigns[_.findIndex(advertiser.campaigns, c => c._id.toString() === campaignId)];

                        const creatives = req.body.creatives;
                        if (!creatives){
                            return res.status(400).send({
                                message: "No creative ID's provided. " +
                                "You must provide an array of creative IDs to remove in request body `creatives` " +
                                "parameter."
                            });
                        }
                        let updateBidder = false;
                        creatives.forEach(cr => {
                            // find creativeGroup containing this creative
                            const creativegroup = _.find(campaign.creativegroups, crg => _.find(crg.creatives, creative => creative.id === cr));
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

                        advertiser.save(err => {
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
                    const sess = req.session;
                    if (sess.campaignDrafts){
                        return res.json(sess.campaignDrafts);
                    } else {
                        return res.json(null);
                    }
                },
                getForAdvertiser: function (req, res) {
                    const sess = req.session;
                    const advertiserId = req.advertiser.id;
                    if (sess.campaignDrafts){
                        const drafts = sess.campaignDrafts.filter(draft => draft.advertiserId === advertiserId);
                        return res.json(drafts);
                    } else {
                        return res.json(null);
                    }
                },
                create: function (req, res) {
                    const draft = req.body;
                    if (!draft.advertiserId){
                        return res.status(400).send({
                            message: 'CampaignDraft must contain an advertiserId'
                        });
                    }
                    draft.tstamp = new Date();
                    const sess = req.session;
                    sess.campaignDrafts = sess.campaignDrafts || [];
                    // Give draft a Mongo-style ObjectId
                    draft.draftId = mongoose.Types.ObjectId();
                    sess.campaignDrafts.push(draft);
                    return res.json(draft);
                },
                read: function (req, res) {
                    _getDraftById(req, (err, draft) => {
                        if (err) return res.status(404).send(err);
                        return res.json(draft);
                    });
                },
                update: function (req, res) {
                    _getDraftById(req, (err, draft) => {
                        if (err) return res.status(404).send(err);
                        _.extend(draft, req.body);
                        // update timestamp
                        draft.tstamp = new Date();
                        return res.json(draft);
                    });
                },
                remove: function (req, res) {
                    const sess = req.session;
                    const draftId = req.param('draftId');
                    _getDraftById(req, (err, draft) => {
                        if (err) return res.status(404).send(err);
                        _.remove(sess.campaignDrafts, d => d.draftId === draft.draftId);
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
                const secure = JSON.parse(req.query.secure);
                const tag = new tags.ActionBeaconTag(adserverHostname, {
                    port: secure ? adserverSecurePort : adserverPort,
                    secure: JSON.parse(req.query.secure),
                    secure_hostname: adserverSecureHostname
                });
                const actionbeaconId = req.param('actionbeaconId');
                const actionbeacon = _.find(req.advertiser.actionbeacons, b => b.id === actionbeaconId);
                if (actionbeacon){
                    // Kind of a hack, but don't want to change render method
                    actionbeacon.parent_advertiser = {};
                    actionbeacon.parent_advertiser.id = req.advertiser.id;
                    const rendered = tag.render(actionbeacon);
                    res.json({tag: rendered});
                } else {
                    res.status(400).send({message: `No actionbeacon with id ${actionbeaconId} found under advertiser ID ${req.advertiser.id}`});
                }
            }
        }
    };
};
