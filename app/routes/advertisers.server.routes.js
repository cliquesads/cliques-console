/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app, routers){
    var advertisers = require('../controllers/advertisers.server.controller')(app.db);

    var router = routers.apiRouter;
    /* ---- Advertiser API Routes ---- */
    router.route('/advertiser')
        .get(advertisers.getMany)
        .put(advertisers.hasAuthorization, advertisers.updateOrCreate)
        .post(advertisers.create);

    router.route('/advertiser/:advertiserId')
        .get(advertisers.hasAuthorization, advertisers.read)
        .patch(advertisers.hasAuthorization, advertisers.update)
        .delete(advertisers.hasAuthorization, advertisers.remove);

    router.route('/advertiser/:advertiserId/campaign/:campaignId/activate')
        .put(advertisers.hasAuthorization, advertisers.campaign.activate);

    router.route('/advertiser/:advertiserId/campaign/:campaignId/deactivate')
        .put(advertisers.hasAuthorization, advertisers.campaign.deactivate);

    router.route('/advertiser/:advertiserId/campaign/:campaignId/creativegroup/:creativeGroupId/creative/:creativeId/activate')
        .put(advertisers.hasAuthorization, advertisers.campaign.creativeGroup.creative.activate);

    router.route('/advertiser/:advertiserId/campaign/:campaignId/creativegroup/:creativeGroupId/creative/:creativeId/deactivate')
        .put(advertisers.hasAuthorization, advertisers.campaign.creativeGroup.creative.deactivate);

    router.route('/advertiser/:advertiserId/actionbeacon/:actionbeaconId')
        .get(advertisers.hasAuthorization, advertisers.actionbeacon.getTag);

    // Campaign Draft Endpoints
    router.route('/campaign-draft')
        .get(advertisers.campaign.draft.getAllInSession)
        .post(advertisers.campaign.draft.create);

    router.route('/campaign-draft/:draftId')
        .get(advertisers.campaign.draft.read)
        .patch(advertisers.campaign.draft.update)
        .delete(advertisers.campaign.draft.remove);

    // route to get by advertiserId
    router.route('/advertiser/:advertiserId/campaign/draft')
        .get(advertisers.campaign.draft.getForAdvertiser);

    router.param('advertiserId', advertisers.advertiserByID);
};
