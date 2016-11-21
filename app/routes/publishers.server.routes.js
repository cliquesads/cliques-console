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
         * @api {get} /sitesinclique Get All Sites In a Clique
         * @apiName GetSitesInClique
         * @apiGroup SitesInClique
         * @apiDescription Gets all Publisher objects owned by user account's `organization`.
         *  **NOTE**: If user account is under a `networkAdmin` Organization, this will get ALL Publishers.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiSuccess {Object[]} ::publishers:: Array of Publishers as response `body` (see [above](#api-Publisher)
         *  for all fields).
         */
        .get(organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInClique);
    router.route('/sitesincliquebranch/:cliqueId')
        .get(organizations.organizationHasAuthorization(['networkAdmin','advertiser']), publishers.site.getSitesInCliqueBranch);

    router.route('/publisher/:publisherId')
        .get(publishers.hasAuthorization, publishers.read)
        .patch(publishers.hasAuthorization, publishers.update)
        .delete(publishers.hasAuthorization, publishers.remove);

    router.route('/publisher/:publisherId/placement/:placementId')
        .get(publishers.hasAuthorization, publishers.placement.getTag);

    router.param('publisherId', publishers.publisherByID);
};
