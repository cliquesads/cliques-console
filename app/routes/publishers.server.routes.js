/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var organizations = require('../controllers/organizations.server.controller');
var passport = require('passport');

module.exports = function(db, routers){
    var publishers = require('../controllers/publishers.server.controller')(db);
    var router = routers.apiRouter;

    /**
     * @apiDefine PublisherSchema
     * @apiParam (Body (Publisher Schema)) {String} [_id=NewObjectID]       Publisher ID, MongoDB ObjectID. Will be auto-generated for
     *  new publishers.
     * @apiParam (Body (Publisher Schema)) {String} name                    Publisher name.
     * @apiParam (Body (Publisher Schema)) {String} [user]                  **DEPRECATED** - Use `organization` instead.
     * @apiParam (Body (Publisher Schema)) {String} organization            ObjectID of organization to which this Publisher belongs.
     * @apiParam (Body (Publisher Schema)) {String} [logo_url]              Google Cloud Storage URL for logo image.
     * @apiParam (Body (Publisher Schema)) {String} [revenue_share]         **DEPRECATED** - Revshare data is stored on
     *  Organization object instead.
     * @apiParam (Body (Publisher Schema)) {String} website                 URL to Publisher website.
     * @apiParam (Body (Publisher Schema)) {String} description             Publisher description
     * @apiParam (Body (Publisher Schema)) {String} [tstamp=Date.now]       UTC timestamp of object creation. Not currently updated on
     *  object modification.
     * @apiParam (Body (Publisher Schema)) {Array[]} [cliques]                **DEPRECATED**
     * @apiParam (Body (Publisher Schema)) {Object[]} [sites]               Array of Site objects, which represent underlying
     *  websites where ads will be placed.
     * @apiParam (Body (Publisher Schema)) {String} sites.name              name of this Site
     * @apiParam (Body (Publisher Schema)) {Boolean} [sites.active=false]         Active flag.
     * @apiParam (Body (Publisher Schema)) {String} [sites.description]           Site description,
     * @apiParam (Body (Publisher Schema)) {String} sites.logo_url          Google Cloud Storage URL for logo image for this Site.
     * @apiParam (Body (Publisher Schema)) {String} [sites.tstamp=Date.now] UTC timestamp of object creation. Not currently updated on
     *  object modification.
     * @apiParam (Body (Publisher Schema)) {String} sites.domain_name       Domain name (e.g. "google.com") for this Site.
     * @apiParam (Body (Publisher Schema)) {String[]} [sites.blacklist]     Array of domains for advertisers this
     *  publisher wants to block, e.g. `['donaldtrump.com','hilaryclinton.com']`
     * @apiParam (Body (Publisher Schema)) {Number} sites.bidfloor          Floor price (CPM) for this site. If auction clears for
     *  lower than this price, winning bidder's ad will not be shown, & default condition will kick in.
     * @apiPram (Body (Publisher Schema)) {String} clique                   ObjectID of Clique that this site belongs to.
     * @apiParam (Body (Publisher Schema)) {Object[]} [sites.pages]         Array of Page objects
     * @apiParam (Body (Publisher Schema)) {String} sites.pages.name        Name of page
     * @apiParam (Body (Publisher Schema)) {Boolean} [sites.pages.active=false]         active flag for page
     * @apiParam (Body (Publisher Schema)) {String} [sites.pages.description]           Description of page
     * @apiParam (Body (Publisher Schema)) {String} [sites.pages.tstamp=Date.now] UTC timestamp of object creation. Not currently updated on
     *  object modification.
     * @apiParam (Body (Publisher Schema)) {String} sites.pages.url         Full URL of page, may contain some placeholders like <DATE> for variable paths.
     * @apiParam (Body (Publisher Schema)) {String} sites.pages.clique      ObjectID of Clique that this page belongs to. **NOTE** Not currently used but will be
     *  in the future.
     * @apiParam (Body (Publisher Schema)) {Object[]} [sites.pages.placements]     Array of Page's Placement objects
     * @apiParam (Body (Publisher Schema)) {String} sites.pages.placements.name   Name of placement
     * @apiParam (Body (Publisher Schema)) {Boolean} [sites.pages.placements.active=false]   Active flag for placement
     * @apiParam (Body (Publisher Schema)) {String} [sites.pages.placements.description]    Description for placement
     * @apiParam (Body (Publisher Schema)) {String} [sites.pages,placements.tstamp=Date.now] UTC timestamp of object
     *  creation. Not currently updated on object modification.tstamp.
     * @apiParam (Body (Publisher Schema)) {Number} sites.pages.placements.h    Height in pixels of placement.
     * @apiParam (Body (Publisher Schema)) {Number} sites.pages.placements.w    Width in pixels of placement.
     * @apiParam (Body (Publisher Schema)) {Number} sites.pages.placements.pos  Position of placement on page.
     *  [OpenRTB 2.3](https://www.iab.com/wp-content/uploads/2015/06/OpenRTB-API-Specification-Version-2-3.pdf) Section
     *  5.4 for list & definitions
     * @apiParam (Body (Publisher Schema)) {String="passback","hostedCreative","psa","hide"} sites.pages.placements.defaultType
     * Default condition type, i.e. what happens when auction defaults.
     *  * `passback` will return user-uploaded `passbackTag` on default. If this is set, `passbackTag` param is required.
     *  * `hostedCreative` serves a hosted ad (e.g. house ad, something similar) on default.  If this is set, `hostedCreatives` is required.
     *  * `psa` **NOT IN USE YET**
     *  * `hide` will simply return an empty response
     * @apiParam (Body (Publisher Schema)) {String} [sites.pages.placements.passbackTag] Passback tag (HTML) to serve if
     *  `defaultType` is set to `passback` and default condition is triggered.
     * @apiParam (Body (Publisher Schema)) {Object[]} [sites.pages.placements.hostedCreatives]     Array of creative objects (see [Advertiser Creative Schema](#api-Advertiser))
     *  to serve if `hostedCreative` is set to `passback` and default condition is triggered.  One creative will be
     *  chosen at random from array when served.
     */

    /* ---- Publisher API Routes ---- */
    router.route('/publisher')
        /**
         * @api {post} /publisher Create a New Publisher
         * @apiName CreatePublisher
         * @apiGroup Publisher
         * @apiDescription Create a new Publisher.  Pass a new Publisher object in the request `body`.
         *
         * ## Publisher Schema Overview ##
         * The `Publisher` object is pretty complicated, so I've provided an outline of the document structure here
         * for convenience:
         *
         * * **Publisher**: Top-level object representing a single publishing house (ex: Active Interest Media, Competitor Group) and holds its metadata.
         *   * **Site**: Represents an actual web property.
         *      * **Page**: Single page on a given web property
         *          * **Placement** - Ad placement on a page
         *
         * See below for the full Publisher schema.
         *
         * ## Hooks ##
         *  1. Send internal email notifying admins of new publisher
         *
         * @apiUse PublisherSchema
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiSuccess {Object} ::publisher:: Newly-created Publisher object as response `body` (see [above](#api-Publisher) for all fields).
         */
        .post(publishers.create)
        /**
         * @api {get} /publisher Get All Publishers
         * @apiName GetPublishers
         * @apiGroup Publisher
         * @apiDescription Gets all Publisher objects owned by user account's `organization`.
         *  **NOTE**: If user account is under a `networkAdmin` Organization, this will get ALL Publishers.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiSuccess {Object[]} ::publishers:: Array of Publishers as response `body` (see [above](#api-Publisher)
         *  for all fields).
         */
        .get(publishers.getMany);


    router.route('/sitesinclique/:cliqueId')
        /**
         * @api {get} /sitesinclique/:cliqueId Get All Sites In a Clique
         * @apiName GetSitesInClique
         * @apiGroup SitesInClique
         * @apiDescription Gets all Site objects (Publisher sub-docs) that belong to a given Clique.
         *
         * For convenience, parent Publisher fields are nested in Site object under `parent_publisher` param.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiParam (Path Parameters){String} cliqueId ObjectID of Clique
         *
         * @apiSuccessExample {json} Success Response:
         *      HTTP/1.1 200 OK
         *      [{
         *          "logo_url": "http://storage.googleapis.com/cliquesads-console-logos-us/aad90bd51bb010abb7563ec706a2a747",
         *          "name": "Wild Snow",
         *          "description": "Deep website covers all aspects of backcountry skiing and ski touring, worldwide audience, all season coverage.",
         *          "domain_name": "www.wildsnow.com",
         *          "clique": "Snowsports",
         *          "bidfloor": 4.75,
         *          "_id": "56ccc23038791b802e292805",
         *          "blacklist": [
         *              "donaldtrump.com",
         *              "clinton.com"
         *           ],
         *           "pages": [...Pages Array...],
         *           "tstamp": "2016-02-23T20:33:52.724Z",
         *           "active": true,
         *           "logo_secure_url": "https://storage.googleapis.com/cliquesads-console-logos-us/aad90bd51bb010abb7563ec706a2a747",
         *           "id": "56ccc23038791b802e292805",
         *           "parent_publisher": {...Publisher Metadata...}
         *        },
         *        {
         *           "logo_url": "http://storage.googleapis.com/cliquesads-console-logos-us/1ee5cc9727f0fcc6ba8fd2637109d8cd",
         *           "name": "ZRankings LLC",
         *           "description": "Best Ski Resorts In North America - thorough data and recommendations on 220 ski resorts. Articles and content on skiing, adventure travel.",
         *           "domain_name": "zrankings.com",
         *           "clique": "Snowsports",
         *           "bidfloor": 2.5,
         *           "_id": "56ce6af7c7bc673c48038256",
         *           "blacklist": [],
         *           "pages": [...Pages Array...],
         *           "tstamp": "2016-02-25T02:46:15.734Z",
         *           "active": true,
         *           "logo_secure_url": "https://storage.googleapis.com/cliquesads-console-logos-us/1ee5cc9727f0fcc6ba8fd2637109d8cd",
         *           "id": "56ce6af7c7bc673c48038256",
         *           "parent_publisher": {...Publisher Metadata...}
         *        },
         *        {
         *           "logo_url": "http://storage.googleapis.com/cliquesads-console-logos-us/5011123834def5a193f72cc73d7cede0",
         *           "name": "TGR Snow",
         *           "description": "Ski & Snowboard related contenton Tetongravity.com",
         *           "domain_name": "www.tetongravity.com",
         *           "clique": "Snowsports",
         *           "bidfloor": null,
         *           "_id": "562e6d618a7d5cc269f36e57",
         *           "blacklist": [],
         *           "pages": [...Pages Array...]
         *           "tstamp": "2015-10-26T18:13:53.168Z",
         *           "active": true,
         *           "logo_secure_url": "https://storage.googleapis.com/cliquesads-console-logos-us/5011123834def5a193f72cc73d7cede0",
         *           "id": "562e6d618a7d5cc269f36e57",
         *           "parent_publisher": {...Publisher Metadata...}
         *        }]
         *
         * @apiSuccess {Object[]} ::sites:: Array of Sites as response `body` (see [above](#api-Publisher)
         *  for all fields).
         */
        .get(organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInClique);
    router.route('/sitesincliquebranch/:cliqueId')
        /**
         * @api {get} /sitesinclique/:cliqueId Get All Sites In a Clique Branch
         * @apiName GetSitesInCliqueBranch
         * @apiGroup SitesInClique
         * @apiDescription Gets all Site objects (Publisher sub-docs) that belong to a given Clique & **all child Cliques.**
         * Returns arrays of sites grouped by Clique.
         *
         * For convenience, parent Publisher fields are nested in Site object under `parent_publisher` param.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiParam (Path Parameters){String} cliqueId ObjectID of Clique
         *
         * @apiSuccessExample {json} Success Response:
         *      HTTP/1.1 200 OK
         *      [{
         *           "_id": "Snowsports",
         *           "name": "Snowsports",
         *           "sites": [
         *                {
         *                      "logo_url": "http://storage.googleapis.com/cliquesads-console-logos-us/aad90bd51bb010abb7563ec706a2a747",
         *                      "name": "Wild Snow",
         *                      "description": "Deep website covers all aspects of backcountry skiing and ski touring, worldwide audience, all season coverage.",
         *                      "domain_name": "www.wildsnow.com",
         *                      "clique": "Snowsports",
         *                      "bidfloor": 4.75,
         *                      "_id": "56ccc23038791b802e292805",
         *                      "blacklist": [
         *                        "donaldtrump.com",
         *                        "clinton.com"
         *                      ],
         *                      "pages": [...Pages Array...],
         *                      "tstamp": "2016-02-23T20:33:52.724Z",
         *                      "active": true,
         *                      "logo_secure_url": "https://storage.googleapis.com/cliquesads-console-logos-us/aad90bd51bb010abb7563ec706a2a747",
         *                      "id": "56ccc23038791b802e292805",
         *                      "parent_publisher": {...Publisher Metadata...}
         *                }
         *                {
         *                      "logo_url": "http://storage.googleapis.com/cliquesads-console-logos-us/1ee5cc9727f0fcc6ba8fd2637109d8cd",
         *                      "name": "ZRankings LLC",
         *                      "description": "Best Ski Resorts In North America - thorough data and recommendations on 220 ski resorts. Articles and content on skiing, adventure travel.",
         *                      "domain_name": "zrankings.com",
         *                      "clique": "Snowsports",
         *                      "bidfloor": 2.5,
         *                      "_id": "56ce6af7c7bc673c48038256",
         *                      "blacklist": [],
         *                      "pages": [...Pages Array...],
         *                      "tstamp": "2016-02-25T02:46:15.734Z",
         *                      "active": true,
         *                      "logo_secure_url": "https://storage.googleapis.com/cliquesads-console-logos-us/1ee5cc9727f0fcc6ba8fd2637109d8cd",
         *                      "id": "56ce6af7c7bc673c48038256",
         *                      "parent_publisher": {...Publisher Metadata...}
         *                },
         *                {
         *                  "logo_url": "http://storage.googleapis.com/cliquesads-console-logos-us/5011123834def5a193f72cc73d7cede0",
         *                  "name": "TGR Snow",
         *                  "description": "Ski & Snowboard related contenton Tetongravity.com",
         *                  "domain_name": "www.tetongravity.com",
         *                  "clique": "Snowsports",
         *                  "bidfloor": null,
         *                  "_id": "562e6d618a7d5cc269f36e57",
         *                  "blacklist": [],
         *                  "pages": [...Pages Array...]
         *                  "tstamp": "2015-10-26T18:13:53.168Z",
         *                  "active": true,
         *                  "logo_secure_url": "https://storage.googleapis.com/cliquesads-console-logos-us/5011123834def5a193f72cc73d7cede0",
         *                  "id": "562e6d618a7d5cc269f36e57",
         *                  "parent_publisher": {...Publisher Metadata...}
         *                }
         *           ]
         *      },
         *      {
         *           "_id": "Nordic Skiing",
         *           "name": "Nordic Skiing",
         *           "sites": [
         *                {
         *                      "logo_url": "http://storage.googleapis.com/cliquesads-console-logos-us/18eeb14d16f8ab70eb3cd6d6c8b3093f",
         *                      "name": "FasterSkier",
         *                      "description": "FasterSkier prides itself in being the premier source of English-language news and feature content related to all things nordic: cross-country skiing, biathlon and nordic combined. We are a web-based publication, bringing both the rigor of a daily newspaper and the passion of a targeted magazine to our work.",
         *                      "domain_name": "fasterskier.com",
         *                      "clique": "Nordic Skiing",
         *                      "bidfloor": null,
         *                      "_id": "565dc3218332938b33de4da7",
         *                      "blacklist": [],
         *                      "pages": [...Pages Array...]
         *                      "tstamp": "2015-12-01T15:56:17.754Z",
         *                      "active": true,
         *                      "logo_secure_url": "https://storage.googleapis.com/cliquesads-console-logos-us/18eeb14d16f8ab70eb3cd6d6c8b3093f",
         *                      "id": "565dc3218332938b33de4da7",
         *                      "parent_publisher": {...Publisher Metadata...}
         *                }
         *           ]
         *      }]
         *
         *
         * @apiSuccess {Object[]} ::cliques_and_sites:: Array of Cliques with arrays of Sites belonging to each clique nested under `sites` as response `body` (see [above](#api-Publisher).
         *  for all fields).
         */
        .get(organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInCliqueBranch);

    router.route('/publisher/:publisherId')
        /**
         * @api {get} /publisher/:publisherId Get One Publisher
         * @apiName ReadPublisher
         * @apiGroup Publisher
         * @apiDescription Finds single [Publisher](#api-Publisher) by ID.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} publisherId ObjectID of Publisher
         *
         * @apiSuccess {Object} ::publisher:: Matching Publisher object as response `body` (see [above](#api-Publisher)
         * for all fields)..
         */
        .get(publishers.hasAuthorization, publishers.read)
        /**
         * @api {patch} /publisher/:publisherId Update Publisher
         * @apiName UpdatePublisher
         * @apiGroup Publisher
         * @apiDescription Updates an [Publisher](#api-Publisher) by ID. Publisher will be updated completely
         *  with the contents of request `body`.
         *
         *  ## Hooks ##
         *  1. If any new sites were created, sends internal email to notify that new sites were created.
         *  2. Else, if any new pages were created, sends internal email to notify that new pages were created.
         *  3. Else, if any new placements were created, sends internal email to notify that new placements were created.
         *
         *  **NOTE** `networkAdmin` can update any Publisher. `publisher` can only update Publishers owned by their Organization.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} publisherId ObjectID of Publisher
         * @apiParam (Body (Publisher Schema)) {Object} ::publisher:: Publisher object as request `body` (see [above](#api-Publisher) for all fields).
         *
         * @apiSuccess {Object} ::publisher:: Updated Publisher object as response `body` (see [above](#api-Publisher)
         * for all fields)..
         */
        .patch(publishers.hasAuthorization, publishers.update)
        /**
         * @api {delete} /publisher/:publisherId Remove Publisher
         * @apiName RemovePublisher
         * @apiGroup Publisher
         * @apiDescription Removes a [Publisher](#api-Advertiser) by ID.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} publisherId ObjectID of Publisher
         *
         * @apiSuccess {Object} ::advertiser:: Publisher object that was just removed as response `body`
         *  (TODO: sort of weird to return deleted advertiser object as response)
         */
        .delete(publishers.hasAuthorization, publishers.remove);

    router.route('/publisher/:publisherId/placement/:placementId')
        /**
         * @api {patch} /publisher/:publisherId/placement/:placementId Get Placement Tag
         * @apiName GetPlacementTag
         * @apiGroup Publisher
         * @apiDescription Gets tag (code) for specific placement.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} publisherId ObjectID of parent Publisher
         * @apiParam (Path Parameters){String} placementId ObjectID of Placement
         * @apiParam (Query Parameters){Boolean} secure=false flag to indicate whether secure or non-secure tag is requested
         * @apiParam (Query Parameters){String="iframe","javascript"} type
         *
         * @apiSuccess {String} tag HTML of placement tag as desired `type`
         */
        .get(publishers.hasAuthorization, publishers.placement.getTag);

    router.param('publisherId', publishers.publisherByID);
};
