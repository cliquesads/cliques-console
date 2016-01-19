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

    app.route('/advertiser/:advertiserId/campaign/draft')
        .get(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.draft.getMany)
        .post(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.draft.create);

    app.route('/advertiser/:advertiserId/campaign/draft/:draftId')
        .get(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.draft.read)
        .patch(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.draft.update)
        .delete(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.draft.remove);

    app.route('/advertiser/:advertiserId/campaign/:campaignId/activate')
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.activate);

    app.route('/advertiser/:advertiserId/campaign/:campaignId/deactivate')
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.campaign.deactivate);

    app.route('/advertiser/:advertiserId/actionbeacon/:actionbeaconId')
        .get(users.requiresLogin, advertisers.hasAuthorization, advertisers.actionbeacon.getTag);

    app.param('advertiserId', advertisers.advertiserByID);
};
