/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers){
    var advertisers = require('../controllers/advertisers.server.controller')(db);

    var router = routers.apiRouter;
    /* ---- Advertiser API Routes ---- */
    /**
     * @apiDefine AdvertiserSchema
     * @apiParam {String} advertiser.id                 Advertiser ID, unique identifier.
     * @apiParam {String} advertiser.name               Advertiser name.
     * @apiParam {String} advertiser.organization       ObjectID of organization to which this Advertiser belongs.
     * @apiParam {String} advertiser.website            URL to Advertiser website
     * @apiParam {String} [advertiser.description]      Description of advertiser.
     * @apiParam {String} [advertiser.logo_url]         Google Cloud Storage URL for logo image.
     * @apiParam {Boolean} [advertiser.nonprofit=false] Flag for nonprofit advertisers.
     * @apiParam {String} [advertiser.advertiser_fee]   **DEPRECATED**
     * @apiParam {String} [advertiser.tstamp=new Date()]    UTC timestamp of object creation. Not currently updated on object modification.
     * @apiParam {String} [advertiser.currency='USD']   ISO-4217 Currency String. Default is 'USD'.
     * @apiParam {Object[]} [advertiser.actionbeacons]  Array of ActionBeacons.
     * @apiParam {Object[]} [advertiser.campaigns]      Array of this Advertiser's Campaigns.
     */

    router.route('/advertiser')
        /**
         * @api {post} /advertiser Create a New Advertiser
         * @apiName CreateAdvertiser
         * @apiGroup Advertiser
         * @apiDescription Create a new Advertiser.
         * @apiUse AdvertiserSchema
         *
         * @apiSuccess {Object} advertiser Newly-created Advertiser object.
         */
        .post(advertisers.create)
        /**
         * @api {get} /advertiser Get All Advertisers
         * @apiName GetAdvertisers
         * @apiGroup Advertiser
         * @apiDescription Gets all Advertiser objects owned by user account.  If user account is under a
         * networkAdmin Organization, this will get ALL Advertisers.
         *
         * @apiSuccess {Object[]} advertisers Array of advertisers.
         */
        .get(advertisers.getMany)
        /**
         * @api {put} /advertiser Update or Create an Advertiser
         * @apiName UpdateOrCreateAdvertiser
         * @apiGroup Advertiser
         * @apiUse AdvertiserSchema
         * @apiDescription If Advertiser object in body has `id` param, will update that Advertiser with body.
         * Otherwise, will behave the same away as CreateAdvertiser.
         *
         * @apiSuccess {Object} advertiser Advertiser object that was either updated or created.
         */
        .put(advertisers.hasAuthorization, advertisers.updateOrCreate);


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
