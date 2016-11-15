/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers){
    var advertisers = require('../controllers/advertisers.server.controller')(db);

    var router = routers.apiRouter;
    /* ---- Advertiser API Routes ---- */

    /**
     * @apiDefine AdvertiserSchema
     * @apiSuccess {String} advertiser.id           Advertiser ID, unique identifier.
     * @apiSuccess {String} advertiser.name         Advertiser name.
     * @apiSuccess {String[]} advertiser.user       **DEPRECATED - Use Organization instead** Array of users who have access to this advertiser.
     * @apiSuccess {String} advertiser.organization ObjectID of organization to which this Advertiser belongs.
     * @apiSuccess {String} [description]           Optional description of advertiser.
     * @apiSuccess {String} logo_url                Google Cloud Storage URL for logo image.
     * @apiSuccess {Boolean} nonprofit              Flag for nonprofit advertisers.
     * @apiSuccess {String} advertiser_fee          **DEPRECATED**
     * @apiSuccess {String} website                 URL to Advertiser website
     * @apiSuccess {String} tstamp                  UTC timestamp of object creation. Not currently updated on object modification.
     * @apiSuccess {String} currency                ISO-4217 Currency String. Default is 'USD'.
     * @apiSuccess {Object[]} campaigns             Array of this Advertiser's Campaigns.
     * @apiSuccess {Object[]} actionbeacons         Array of ActionBeacons.
     */

    router.route('/advertiser')
        /**
         * @api {get} /advertiser Get all Advertisers owned by account.
         * @apiName GetAdvertiser
         * @apiGroup Advertiser
         * @apiDescription Gets all Advertiser objects owned by user account.  If user account is under a
         * networkAdmin Organization, this will get ALL Advertisers.
         *
         * @apiSuccess {Object[]} advertiser Array of advertisers.
         * @apiUse AdvertiserSchema
         */
        .get(advertisers.getMany)
        /**
         * @api {put} /advertiser Update or Create an Advertiser.
         * @apiName UpdateOrCreateAdvertiser
         * @apiGroup Advertiser
         * @apiDescription If Advertiser object in body has `id` param, will update that Advertiser with body.
         * Otherwise, will behave the same away as CreateAdvertiser.
         *
         * @apiSuccess {Object} advertiser Advertiser object that was either updated or created.
         * @apiUse AdvertiserSchema
         */
        .put(advertisers.hasAuthorization, advertisers.updateOrCreate)
        /**
         * @api {post} /advertiser Create a new Advertiser.
         * @apiName CreateAdvertiser
         * @apiGroup Advertiser
         *
         * @apiSuccess {Object} advertiser Newly-created advertiser object.
         * @apiUse AdvertiserSchema
         */
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
