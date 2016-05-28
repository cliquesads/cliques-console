/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var advertisers = require('../controllers/advertisers.server.controller')(app.db);

    /* ---- Advertiser API Routes ---- */
    app.route('/advertiser')
        .get(users.requiresLogin, advertisers.getMany)
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.updateOrCreate)
        .post(users.requiresLogin, advertisers.create);

    app.route('/advertiser/:advertiserId')
        .get(users.requiresLogin, advertisers.hasAuthorization, advertisers.read)
        .patch(users.requiresLogin, advertisers.hasAuthorization, advertisers.update)
        .delete(users.requiresLogin, advertisers.hasAuthorization, advertisers.remove);

    app.route('/advertiser/:advertiserId/campaign/:campaignId/activate')
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.activate);

    app.route('/advertiser/:advertiserId/campaign/:campaignId/deactivate')
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.deactivate);

    app.route('/advertiser/:advertiserId/campaign/:campaignId/creativegroup/:creativeGroupId/creative/:creativeId/activate')
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.creativeGroup.creative.activate);

    app.route('/advertiser/:advertiserId/campaign/:campaignId/creativegroup/:creativeGroupId/creative/:creativeId/deactivate')
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.creativeGroup.creative.deactivate);

    app.route('/advertiser/:advertiserId/actionbeacon/:actionbeaconId')
        .get(users.requiresLogin, advertisers.hasAuthorization, advertisers.actionbeacon.getTag);

    // Campaign Draft Endpoints
    app.route('/campaign-draft')
        .get(users.requiresLogin, advertisers.campaign.draft.getAllInSession)
        .post(users.requiresLogin, advertisers.campaign.draft.create);

    app.route('/campaign-draft/:draftId')
        .get(users.requiresLogin, advertisers.campaign.draft.read)
        .patch(users.requiresLogin, advertisers.campaign.draft.update)
        .delete(users.requiresLogin, advertisers.campaign.draft.remove);

    // route to get by advertiserId
    app.route('/advertiser/:advertiserId/campaign/draft')
        .get(users.requiresLogin, advertisers.campaign.draft.getForAdvertiser);

    app.param('advertiserId', advertisers.advertiserByID);
};
