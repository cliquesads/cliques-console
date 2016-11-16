/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers){
    var advertisers = require('../controllers/advertisers.server.controller')(db);

    var router = routers.apiRouter;
    /* ---- Advertiser API Routes ---- */
    /**
     * @apiDefine AdvertiserSchema
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.id=NewObjectID]       Advertiser ID, MongoDB ObjectID. Will be auto-generated for
     *  new advertisers.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.name                   Advertiser name.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.organization           ObjectID of organization to which this Advertiser belongs.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.website                URL to Advertiser website
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.description]          Description of advertiser.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.logo_url]             Google Cloud Storage URL for logo image.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.nonprofit=false]     Flag for nonprofit advertisers.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.advertiser_fee]       **DEPRECATED** - Fees held at `Organization` level now
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.tstamp=Date.now]      UTC timestamp of object creation. Not currently updated on
     *  object modification.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.currency='USD']       [ISO-4217](https://en.wikipedia.org/wiki/ISO_4217)
     *  Currency String.
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.actionbeacons]      Array of **ActionBeacons**, pixels that an
     *  Advertiser can place on downstream pages to record actions taken & match these actions back to impressions or
     *  clicks.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.actionbeacons.name     Name of action beacon
     * @apiParam (Body (Advertiser Schema)) {Number} [advertiser.actionbeacons.click_lookback=30]  Number of days to look back for clicks w/
     *  matching user ID for conversion-matching purposes. **NOTE:** Not currently respected by conversion-matching ETL,
     *  added in model for future-proofing.
     * @apiParam (Body (Advertiser Schema)) {Number} [advertiser.actionbeacons.view_lookback=15]   Number of days to look back for impressions w/
     *  matching user ID. **NOTE:** Not currently respected by conversion-matching ETL, added in model for future-proofing.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.actionbeacons.match_view=true]   Flag for whether to match impressions to actions
     *  from this beacon. **NOTE:** Not currently respected by conversion-matching ETL, added in model for future-proofing.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.actionbeacons.match_click=true]  Flag for whether to match clicks to actions
     *  from this beacon. **NOTE:** Not currently respected by conversion-matching ETL, added in model for future-proofing.
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns]                      Array of this Advertiser's **Campaigns**.  The
     *  Campaign sub-document is where all pertinent targeting configuration is held.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.name                     Campaign name.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.active=false]          Campaign active flag.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.clique                   ObjectID of [Clique](#CLIQUELINKHERE)
     *      that this campaign belongs to.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.campaigns.description]            Campaign description.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.campaigns.tstamp=Date.now]        Creation timestamp.
     * @apiParam (Body (Advertiser Schema)) {Number} advertiser.campaigns.budget                   Campaign budget in Advertiser `currency` units
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.start_date               Start datetime of campaign (UTC timestamp)
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.end_date                 End datetime of campaign (UTC timestamp)
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.even_pacing=true]      If `true`, will spend campaign budget evenly
     *      between `start_date` and `end_date`.  If `false`, will spend campaign budget as quickly as possible.
     * @apiParam (Body (Advertiser Schema)) {Number} advertiser.campaigns.max_bid                  Bid ceiling after all linear bid modifications
     *      (see targeting params for more details).
     * @apiParam (Body (Advertiser Schema)) {Number} advertiser.campaigns.base_bid                 Base campaign bid that will be used if no
     *      targeting is applied.
     * @apiParam (Body (Advertiser Schema)) {Number} [advertiser.campaigns.frequency=64]           Maximum number of times in a static 24-hour
     *      period (UTC) in which an ad from this campaign can be displayed to a user.  Bidder will not bid on any users who
     *      have been shown more than this # of impressions in the same 24-hour window.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.placement_targets        **DEPRECATED** - Use `inventory_targets` instead
     * @apiParam (Body (Advertiser Schema)) {String[]} [advertiser.campaigns.blocked_cliques]      **DEPRECATED** - Use `inventory_targets` instead
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.dma_targets]          DMA Targeting Objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.dma_targets.target       ObjectID of targeted DMA object.
     * @apiParam (Body (Advertiser Schema)) {Number{0-10}} [advertiser.campaigns.dma_targets.weight]  Target 'weight', applied linearly
     *      to `base_bid` for impressions from this **DMA**.
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.country_targets]      Country Targeting Objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.country_targets.target   ObjectID of targeted Country object.
     * @apiParam (Body (Advertiser Schema)) {Number{0-10}} [advertiser.campaigns.country_targets.weight]  Target 'weight', applied linearly
     *      to `base_bid` for impressions from this **Country**.
     *
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.inventory_targets]    Array of InventoryTargeting objects
     *      specifying inventory weights & targets.  Each sub-document is nested to mimic the structure of the Publisher
     *      document & sub-documents. **NOTE** Blocking actually starts at the Clique level, not Publisher.  Publishers are
     *      not exposed to Advertisers.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.inventory_targets.target           **[Clique](#CLIQUELINKHERE)** ObjectID of targeted
     *      Clique object.
     * @apiParam (Body (Advertiser Schema)) {Number{0-10}} [advertiser.campaigns.inventory_targets.weight]   Target 'weight', applied linearly
     *      to `base_bid` for impressions from this **Clique**.  Any child weights will override this weight.
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.inventory_targets.children]     Child TargetingSchema objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.inventory_targets.children.target  **[Site](#SITELINKHERE)** ObjectID of targeted
     *      Site object.
     * @apiParam (Body (Advertiser Schema)) {Number{0-10}} [advertiser.campaigns.inventory_targets.children.weight]  Target 'weight', applied linearly
     *      to `base_bid` for impressions from this **Site**.  Any child weights will override this weight.
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.inventory_targets.children.children]    Child TargetingSchema objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.inventory_targets.children.children.target  **Page** ObjectID of targeted
     *      Page object.
     * @apiParam (Body (Advertiser Schema)) {Number{0-10}} [advertiser.campaigns.inventory_targets.children.children.weight]  Target 'weight', applied linearly
     *      to `base_bid` for impressions from this **Page**.
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.inventory_targets.children.children.children]    Child TargetingSchema objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.inventory_targets.children.children.children.target  **Placement** ObjectID of targeted
     *      Placement object.
     * @apiParam (Body (Advertiser Schema)) {Number{0-10}} [advertiser.campaigns.inventory_targets.children.children.children.weight]  Target 'weight', applied linearly
     *      to `base_bid` for impressions from this **Placement**.
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.blocked_inventory]               Array of InventoryTargeting objects
     *      specifying IDs of blocked inventory.  Each sub-document is nested to mimic the structure of the Publisher document
     *      & sub-documents. **NOTE** Like `inventory_targets`, blocking actually starts at Clique level.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.blocked_inventory.target            **[Clique](#Clique)** ObjectID
     *      of blocked Clique object.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.blocked_inventory.explicit=false] Currently, if
     *      `explicit === true`, then this object will be blocked. Otherwise, it's assumed to be an ancestor
     *      placeholder and will be skipped.
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.blocked_inventory.children]      Child BlockSchema objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.blocked_inventory.children.target **Site** ObjectID
     *      of blocked Site object.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.blocked_inventory.children.explicit=false] Currently, if
     *      `explicit === true`, then this object will be blocked. Otherwise, it's assumed to be an ancestor
     *      placeholder and will be skipped.
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.blocked_inventory.children.children]      Child BlockSchema objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.blocked_inventory.children.children.target **Page** ObjectID
     *      of blocked Placement object.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.blocked_inventory.children.children.explicit=false] Currently, if
     *      `explicit === true`, then this object will be blocked. Otherwise, it's assumed to be an ancestor
     *      placeholder and will be skipped.
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.blocked_inventory.children.children.children]    Child BlockSchema objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.blocked_inventory.children.children.target **Placement** ObjectID
     *      of blocked Placement object.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.blocked_inventory.children.children.children.explicit=false] Currently, if
     *      `explicit === true`, then this object will be blocked. Otherwise, it's assumed to be an ancestor
     *      placeholder and will be skipped.
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.creativegroups]       Child CreativeGroups, which hold all
     *      creative config data.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.campaigns.creativegroups.name]    Name of this CreativeGroup.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.campaigns.creativegroups.tstamp=Date.now] UTC timestamp of object
     *      creation. Not currently updated on object modification.
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.creativegroups.active=true] CreativeGroup active flag
     * @apiParam (Body (Advertiser Schema)) {Number} advertiser.campaigns.creativegroups.h         Height (in pixels) of all
     *      creatives in this CreativeGroup. Used in validating child creative heights.
     * @apiParam (Body (Advertiser Schema)) {Number} advertiser.campaigns.creativegroups.w         Width (in pixels) of all creatives
     *      in this CreativeGroup.  Used in validating child creative widths.
     *
     * @apiParam (Body (Advertiser Schema)) {Object[]} [advertiser.campaigns.creativegroups.creatives]    Child Creative objects
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.creativegroups.creatives.name   Name of this creative
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.creativegroups.creatives.active=true] Creative active flag.
     *      Will not serve if `false`.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.campaigns.creativegroups.creatives.type] Ex: "banner", "native" etc.
     *      Not currently used but will be.
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.campaigns.creativegroups.creatives.tstamp=Date.now] UTC timestamp of object
     *      creation. Not currently updated on object modification.
     * @apiParam (Body (Advertiser Schema)) {Number} advertiser.campaigns.creativegroups.creatives.h      Height (in pixels) of creative.
     *      **NOTE** Must equal height of the parent CreativeGroup!
     * @apiParam (Body (Advertiser Schema)) {Number} advertiser.campaigns.creativegroups.creatives.w      Width (in pixels) of creative.
     *      **NOTE** Must equal width of the parent CreativeGroup!
     * @apiParam (Body (Advertiser Schema)) {Boolean} [advertiser.campaigns.creativegroups.creatives.retina=false] Flag to indicate
     *      whether creative has 144 DPI, i.e. dimensions of asset are 2x stated dimensions.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.creativegroups.creatives.url    Google Cloud Storage URL of 
     *      underlying creative asset
     * @apiParam (Body (Advertiser Schema)) {String} [advertiser.campaigns.creativegroups.creatives.tag]  If client uses external
     *      adserver (ex. DFA), this will hold the external ad tag markup.
     * @apiParam (Body (Advertiser Schema)) {String} advertiser.campaigns.creativegroups.creatives.click_url Redirect to this URL when
     *      ad is clicked.
     * @apiParam (Body (Advertiser Schema)) {Number{0-5}} [advertiser.campaigns.creativegroups.creatives.weight=1]    This creative
     *      will serve (warning, pseudo-code ahead) `weight` / `sum(creativegroup.creatives.weight)` of the time.
     */

    router.route('/advertiser')
        /**
         * @api {post} /advertiser Create a New Advertiser
         * @apiName CreateAdvertiser
         * @apiGroup Advertiser
         * @apiDescription Create a new Advertiser.  Pass a new Advertiser object in the request `body`.
         *
         * ## Advertiser Schema Overview ##
         * The `Advertiser` object is pretty complicated, so I've provided an outline of the document structure here
         * for convenience:
         *
         * * **Advertiser**: Top-level object representing a single brand (ex: Ibex, The North Face) and holds its metadata.
         *   * **Campaign**: Represents an actual ad campaign, and contains pertinent budget, bid & targeting data.
         *      * **CreativeGroup**: Container for like-sized creative assets. There should only be **one creative
         *              group per creative size in this campaign**. Currently, the Cliques AdServer serves ads at the
         *              CreativeGroup level (ex: when a 300x250 placement calls for winning ad markup, the 300x250
         *              creative group is called).
         *          * **Creative** - Contains size & URL's for raw assets.
         *
         * See below for the full Advertiser schema.
         * @apiUse AdvertiserSchema
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiSuccess {Object} :advertiserSchema: Newly-created Advertiser object as response `body` (see [above](#api-Advertiser) for all fields).
         */
        .post(advertisers.create)
        /**
         * @api {get} /advertiser Get All Advertisers
         * @apiName GetAdvertisers
         * @apiGroup Advertiser
         * @apiDescription Gets all Advertiser objects owned by user account's `organization`.
         *  **NOTE**: If user account is under a `networkAdmin` Organization, this will get ALL Advertisers.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiSuccess {Object[]} :advertisers: Array of Advertisers as response `body` (see [above](#api-Advertiser)
         *  for all fields).
         */
        .get(advertisers.getMany)
        /**
         * @api {put} /advertiser Update or Create an Advertiser
         * @apiName UpdateOrCreateAdvertiser
         * @apiGroup Advertiser
         * @apiDescription If Advertiser object in body has `id` param, will update that Advertiser with body.
         *  Otherwise, will behave the same away as [CreateAdvertiser](#api-Advertiser-CreateAdvertiser).
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiSuccess {Object} :advertiser: Advertiser object that was either updated or created as response `body`
         *  (see [above](#api-Advertiser) for all fields)..
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
