/* jshint node: true */ 'use strict';
var organizations = require('../controllers/organizations.server.controller');

module.exports = function(db, routers){
    var users = require('../controllers/users.server.controller')(db);
    var aggregations = require('../controllers/aggregations.server.controller')(db);
    var advertisers = require('../controllers/advertisers.server.controller')(db);
    var publishers = require('../controllers/publishers.server.controller')(db);
    var cliques = require('../controllers/cliques.server.controller')(db);

    var router = routers.apiRouter;
    
    /* ---- HourlyAdStats API Routes ---- */

    /* ---- Param Middleware ---- */
    router.param('advertiser', advertisers.advertiserByID);
    router.param('publisher', publishers.publisherByID);

    // TODO: Don't know whether it makes sense to maintain two separate sets of
    // TODO: API endpoints -- one hierarchical based on path params and the other
    // TODO: non-hierarchical.  Need to choose one or the other, gets confusing
    // TODO: pretty quickly.

    /**
     * @apiDefine queryParams
     * @apiParam (Query Parameters) {String} [startDate] (**inclusive**) accepts ISO formatted datetimes, assumed to be UTC. **Ex: '1995-12-17T03:24:00'**
     * @apiParam (Query Parameters) {String} [endDate] (**exclusive**) accepts ISO formatted datetimes, assumed to be UTC. **Ex: '1995-12-17T03:24:00'**
     * @apiParam (Query Parameters) {String} [groupBy] single value or CSV containing additional fields to group by.
     *      Can be any dimension(s) in path or query params. **NOTE: DO NOT INCLUDE DATE FIELD**, use `dateGroupBy`
     *      param instead
     * @apiParam (Query Parameters) {String="hour","day","month","year"} [dateGroupBy="hour"] Human-readable date
     *  dimension by which to group results.  All metric fields will be summed.
     * @apiParam (Query Parameters) {String} [populate] single value or CSV of fields to 'populate' in query response. 'populate'
     *  replaces ObjectId ref with actual object. Populated field **MUST** be in `groupBy`, `dateGroupBy` or path parameters.
     */

    /**
     * @api {get} /[aggregation-endpoint] Aggregations Primer (READ FIRST)
     * @apiName Aggregations
     * @apiGroup Aggregation
     * @apiVersion 0.1.0
     * @apiDescription Aggregation resources expose methods to query flat, MongoDB-style collections that contain
     *  advertising statistics. Each "row" of statistics (or "document" in MongoDB parlance) is annotated with a
     *  number of dimensions to allow for easy aggregation & filtering.
     *
     *  Each Aggregation endpoint uses a common mixin (`HourlyAggregationPipelineVarBuilder`) to translate a given
     *  URL & its parameters to a [MongoDB Aggregation Pipeline](https://docs.mongodb.com/v3.2/aggregation/#aggregation-pipeline).
     *  As such, the parameter structure for all aggregation endpoints is the same, and there are some shared "special"
     *  query parameters as well to make querying easier.
     *
     *  **NOTE:** Unless otherwise noted, all aggregation endpoints are **read-only** (i.e. `get` methods).
     *
     *  # Aggregation Path Parameters
     *  Path parameters on Aggregation endpoints serve the following purposes:
     *  1. They add entity ID's to the `group` step of the pipeline
     *  2. They add entity ID's to the `match` step of the pipeline
     *  3. They check that the requesting client has the permissions necessary to view stats for the provided entity ID.
     *
     *  So, for example, a client with role `advertiser` and only one advertiser with ID `12345` will get a `403: Not authorized`
     *  when querying the endpoint `/hourlyadstat/advertiser/4567`.
     *
     *  However, when they query `/hourlyadstat/advertiser/12345`, they will get data grouped & filtered to Advertiser
     *  ID `12345`.
     *
     *  # Aggregation Query Parameters
     *  All entity ID query parameters (ex: `advertiser`,`publisher`,`adv_clique`) are flexible filters. They can not only
     *  filter a given query to data matching a specific entity ID, but they also accept the following operators:
     *  * `{in}` element in comma-separated string of IDs
     *  * `{nin}` element not in comma-separated string of IDs
     *  * `{ne}` matches any row with field val not equal to query val
     *
     *  For example, `GET` requesting the following URL will return all HourlyAdStat data for Advertiser `12345`, not including
     *  any data from creatives `1` and `2`, which presumably belong to Advertiser `12345`:
     *  ```
     *  https://console.cliquesads.com/api/hourlyadstat/advertiser/12345?creative={nin}1,2
     *  ```
     *
     *  Finally, the "special" query parameters in the **Query Parameter** section below are available on any Aggregation endpoint:
     *  @apiUse queryParams
     */

    /* ---- GENERAL ROUTES ---- */
    router.route('/hourlyadstat')
        /**
         * @api {get} /hourlyadstat Get HourlyAdStats
         * @apiName GetHourlyAdStats
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Gets aggregates from HourlyAdStats collection for **networkAdmins** only.
         *
         * For `advertiser` or `publisher`-friendly aggregation endpoints, please see [Get Advertiser HourlyAdStats](#api-GetAdvertiserHourlyAdStats)
         * or [Get Publisher HourlyAdStats](#api-GetPublisherHourlyAdStats).  This endpoint lets you query on **any** Advertiser or Publisher-tree ID's,
         * and as such is restricted to only networkAdmins. 
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Query Parameters) {String} [advertiser] Advertiser ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [campaign] Campaign ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [creativegroup] CreativeGroup ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [creative] Creative ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [adv_clique] Advertiser Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [pub_clique] Publisher Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} hourlyAdStats Array of aggregated HourlyAdStat records.
         * @apiSuccess {Object} hourlyAdStats._id Object containing all fields used to group this query, including
         * `dateGroupBy` fields. Should contain a key for each field that this query used in `group` stage of the pipeline.  Key will be
         *  ObjectId (except for `dateGroupBy` fields, see below) unless a field was specified in query `populate`
         *  parameter, in which case the value will be the entire object.
         * @apiSuccess {Object} [hourlyAdStats._id.date] Object containing numerical date components, if `dateGroupBy` was used.
         * @apiSuccess {Number} [hourlyAdStats._id.date.hour] Available if `dateGroupBy` is `hour`
         * @apiSuccess {Number} [hourlyAdStats._id.date.day] Available if `dateGroupBy` is `hour` or `day`
         * @apiSuccess {Number} [hourlyAdStats._id.date.month] Available if `dateGroupBy` is `hour`,`day`, or `month`
         * @apiSuccess {Number} [hourlyAdStats._id.date.year] Available if `dateGroupBy` is `hour`,`day`,`month` or `year`
         * @apiSuccess {Number} [hourlyAdStats.bids] Total number of bids from all bidders
         * @apiSuccess {Number} [hourlyAdStats.imps] Total number of impressions, or number of ads that were actually served
         * @apiSuccess {Number} [hourlyAdStats.defaults] Total number of defaults, i.e. failed auctions
         * @apiSuccess {Number} [hourlyAdStats.spend] Total media spend in USD, not including any fees / not net of any rev-share
         * @apiSuccess {Number} [hourlyAdStats.clicks] Total number of clicks on ads served
         * @apiSuccess {Number} [hourlyAdStats.view] Total number of view-through conversions observed during aggregation grouping timeframe.
         *  That is, the total number of action-beacon calls that were observed from a user for which an impression was previously recorded.
         * @apiSuccess {Number} [hourlyAdStats.click] Total number of click-through conversions observed during aggregation grouping timeframe.
         *  That is, the total number of action-beacon calls that were observed from a user for which a click was previously recorded.
         *
         * @apiSuccessExample {json} Example Request URL:
         *      https://console.cliquesads.com/api/hourlyadstat?publisher=55d61473306794d759f2a575&advertiser={nin}5630f3f18a7d5cc269f36e5d,5589a18d9e4b6d83387bb800&dateGroupBy=month
         * @apiSuccessExample {json} Example Response:
         *      HTTP/1.1 200 OK
         *      [
         *         {
         *            "_id": {
         *               "date": {
         *                  "month": 10,
         *                  "year": 2016
         *               }
         *            },
         *            "bids": 8789,
         *            "imps": 4300,
         *            "defaults": 82384,
         *            "spend": 30.436950000000063,
         *            "clicks": 4,
         *            "view_convs": 0,
         *            "click_convs": 0
         *         },
         *         {
         *            "_id": {
         *               "date": {
         *                  "month": 9,
         *                  "year": 2016
         *            }
         *         },
         *         "bids": 9112,
         *         "imps": 6658,
         *         "defaults": 93487,
         *         "spend": 59.922000000000104,
         *         "clicks": 3,
         *         "view_convs": 0,
         *         "click_convs": 0
         *         },
         *         {
         *            "_id": {
         *               "date": {
         *                  "month": 8,
         *                  "year": 2016
         *               }
         *            },
         *            "bids": 16066,
         *            "imps": 9190,
         *            "defaults": 28602,
         *            "spend": 81.04000000000234,
         *            "clicks": 12,
         *            "view_convs": 0,
         *            "click_convs": 0
         *         },
         *         {
         *            "_id": {
         *               "date": {
         *                  "month": 7,
         *                  "year": 2016
         *               }
         *            },
         *            "bids": 8087,
         *            "imps": 6493,
         *            "defaults": 20535,
         *            "spend": 47.23082000000005,
         *            "clicks": 7,
         *            "view_convs": 0,
         *            "click_convs": 0
         *         }
         *      ]
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(organizations.organizationHasAuthorization(['networkAdmin']), aggregations.hourlyAdStat.getMany);

    // TODO: Technically this isn't totally safe, someone could theoretically pass
    // TODO: in entity ID's for entities which did not belong to them.  However I think
    // TODO: the probability of someone knowing a Mongo ObjectID for another advertiser,
    // TODO: publisher etc. is pretty damn unlikely
    //
    // TODO: One solution could be to strip out any unsafe query params passed in
    // TODO: in the handler method, but I don't care enough about it to make this
    // TODO: a worthwhile exercise.
    router.route('/hourlyadstat/advSummary')
        /**
         * @api {get} /hourlyadstat/advSummary Get HourlyAdStats Advertiser Summary
         * @apiName GetHourlyAdStatsAdvSummary
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription General HourlyAdStat query endpoint for Advertisers. First gets all [Advertisers](#api-Advertiser)
         *  belonging to user, then filters the subsequent aggregation query (specified by query params) by these
         *  Advertisers. Only accepts query parameters.
         *
         *  For `networkAdmins`, the result is the same as calling [Get All Advertisers](#api-Advertiser-GetAdvertisers), parsing out
         *  the resulting advertiser ID's, and then passing those ID's back in the `advertiser` query parameter as
         *  `advertiser={in}<CSV of Advertiser ID's>`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiParam (Query Parameters) {String} [advertiser] Advertiser ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [campaign] Campaign ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [creativegroup] CreativeGroup ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [creative] Creative ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [adv_clique] Advertiser Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [pub_clique] Publisher Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiSuccessExample {json} Example Request URL:
         *      https://console.cliquesads.com/api/hourlyadstat/advSummary?publisher=55d61473306794d759f2a575&groupBy=publisher,placement&populate=publisher,placement&startDate=2016-06-07T06:00:00.000Z&endDate=2016-06-08T06:00:00.000Z
         * @apiSuccessExample {json} Example Response:
         *      HTTP/1.1 200 OK
         *      // NOTE: All results are now filtered to match only advertisers belonging to account
         *      // (which is all advertisers if user is networkAdmin)
         *      [
         *         {
         *            "_id": {
         *               "publisher": "55d61473306794d759f2a575",
         *               "placement": {
         *                  "name": "CXHairs Bottom 728x90",
         *                  "h": 90,
         *                  "w": 728,
         *                  "pos": 3,
         *                  "_id": "55d61473306794d759f2a579",
         *                  "hostedCreatives": [
         *                     {
         *                        "name": "Cliques Sunrise Image 728x90",
         *                        "click_url": "http://cliquesads.com",
         *                        "w": 728,
         *                        "h": 90,
         *                        "url": "http://storage.googleapis.com/cliquesads-creativeassets-us/54f6761fcf28fe88c268cbde7525780f",
         *                        "_id": "56c437bad914602205e83006",
         *                        "weight": 1,
         *                        "retina": true,
         *                        "tstamp": "2016-02-17T09:04:58.604Z",
         *                        "active": true,
         *                        "secureUrl": "https://storage.googleapis.com/cliquesads-creativeassets-us/54f6761fcf28fe88c268cbde7525780f",
         *                        "id": "56c437bad914602205e83006"
         *                     }
         *                  ],
         *                  "defaultType": "hostedCreative",
         *                  "tstamp": "2015-08-20T17:54:59.596Z",
         *                  "active": true
         *               }
         *            },
         *            "bids": 66,
         *            "imps": 60,
         *            "defaults": 0,
         *            "spend": 0.24800000000000003,
         *            "clicks": 0,
         *            "view_convs": 0,
         *            "click_convs": 0
         *         },
         *         {
         *            "_id": {
         *               "publisher": "55d61473306794d759f2a575",
         *               "placement": {
         *               "name": "CXHairs Sidebar Main 300x250",
         *               "h": 250,
         *               "w": 300,
         *               "pos": 6,
         *               "_id": "55d61473306794d759f2a57a",
         *               "hostedCreatives": [
         *                  {
         *                     "name": "Cliques Sunrise Image 300x250",
         *                     "click_url": "http://cliquesads.com",
         *                     "w": 300,
         *                     "h": 250,
         *                     "url": "http://storage.googleapis.com/cliquesads-creativeassets-us/932256b7bc01514f9610f5b7e32cf56c",
         *                     "_id": "56c437bad914602205e83005",
         *                     "weight": 1,
         *                     "retina": true,
         *                     "tstamp": "2016-02-17T09:04:58.601Z",
         *                     "active": true,
         *                     "secureUrl": "https://storage.googleapis.com/cliquesads-creativeassets-us/932256b7bc01514f9610f5b7e32cf56c",
         *                     "id": "56c437bad914602205e83005"
         *                  }
         *               ],
         *               "defaultType": "hostedCreative",
         *               "tstamp": "2015-08-20T17:54:59.596Z",
         *               "active": true
         *               }
         *            },
         *            "bids": 250,
         *            "imps": 226,
         *            "defaults": 0,
         *            "spend": 0.918,
         *            "clicks": 1,
         *            "view_convs": 0,
         *            "click_convs": 0
         *         }
         *      ]
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         *
         */
        .get(aggregations.hourlyAdStat.getManyAdvertiserSummary);
    router.route('/hourlyadstat/pubSummary')
        /**
         * @api {get} /hourlyadstat/pubSummary Get HourlyAdStats Publisher Summary
         * @apiName GetHourlyAdStatsPubSummary
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription General HourlyAdStat query endpoint for Publishers. First gets all [Publishers](#api-Publisher)
         *  belonging to user, then filters the subsequent aggregation query (specified by query params) by these
         *  Publishers. Only accepts query parameters.
         *
         *  For `networkAdmins`, the result is the same as calling [Get All Publishers](#api-Advertiser-GetPublishers), parsing out
         *  the resulting publisher ID's, and then passing those ID's back in the `publisher` query parameter as
         *  `publisher={in}<CSV of Publisher ID's>`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Query Parameters) {String} [advertiser] Advertiser ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [campaign] Campaign ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [creativegroup] CreativeGroup ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [creative] Creative ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [adv_clique] Advertiser Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [pub_clique] Publisher Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         *
         */
        .get(aggregations.hourlyAdStat.getManyPublisherSummary);

    /* ---- ADVERTISER ROUTES ---- */
    router.route('/hourlyadstat/adv/:advertiser')
        /**
         * @api {get} /hourlyadstat/adv/:advertiser Get HourlyAdStats for Advertiser
         * @apiName GetHourlyAdStatsAdvertiser
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Advertiser. Advertiser ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Publisher tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiParam (Path Parameters) {String} advertiser ObjectId of Advertiser
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(advertisers.hasAuthorization ,aggregations.hourlyAdStat.getManyAdvertiser);
    router.route('/hourlyadstat/adv/:advertiser/:campaign')
        /**
         * @api {get} /hourlyadstat/adv/:advertiser/:campaign Get HourlyAdStats for Campaign
         * @apiName GetHourlyAdStatsCampaign
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Campaign. Campaign ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Publisher tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiParam (Path Parameters) {String} advertiser ObjectId of Advertiser
         * @apiParam (Path Parameters) {String} campaign ObjectId of Campaign belonging to Advertiser
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);
    router.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup')
        /**
         * @api {get} /hourlyadstat/adv/:advertiser/:campaign/:creativegroup Get HourlyAdStats for Creative Group
         * @apiName GetHourlyAdStatsCreativeGroup
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Creative Group. CreativeGroup ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Publisher tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiParam (Path Parameters) {String} advertiser ObjectId of Advertiser
         * @apiParam (Path Parameters) {String} campaign ObjectId of Campaign belonging to Advertiser
         * @apiParam (Path Parameters) {String} creativegroup ObjectId of Creative Group belonging to Campaign
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);
    router.route('/hourlyadstat/adv/:advertiser/:campaign/:creativegroup/:creative')
        /**
         * @api {get} /hourlyadstat/adv/:advertiser/:campaign/:creativegroup/:creative Get HourlyAdStats for Creative
         * @apiName GetHourlyAdStatsCreative
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Creative. Creative ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Publisher tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         *
         * @apiParam (Path Parameters) {String} advertiser ObjectId of Advertiser
         * @apiParam (Path Parameters) {String} campaign ObjectId of Campaign belonging to Advertiser
         * @apiParam (Path Parameters) {String} creativegroup ObjectId of Creative Group belonging to Campaign
         * @apiParam (Path Parameters) {String} creative ObjectId of Creative belonging to CreativeGroup
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(advertisers.hasAuthorization, aggregations.hourlyAdStat.getManyAdvertiser);

    /* ---- PUBLISHER ROUTES ---- */
    router.route('/hourlyadstat/pub/:publisher')
        /**
         * @api {get} /hourlyadstat/pub/:publisher Get HourlyAdStats for Publisher
         * @apiName GetHourlyAdStatsPublisher
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Publisher. Publisher ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Advertiser tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {String} publisher ObjectId of Publisher
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    router.route('/hourlyadstat/pub/:publisher/:site')
        /**
         * @api {get} /hourlyadstat/pub/:publisher/:site Get HourlyAdStats for Site
         * @apiName GetHourlyAdStatsSite
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Site. Site ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Advertiser tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {String} publisher ObjectId of Publisher
         * @apiParam (Path Parameters) {String} site ObjectId of Site
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    router.route('/hourlyadstat/pub/:publisher/:site/:page')
        /**
         * @api {get} /hourlyadstat/pub/:publisher/:site/:page Get HourlyAdStats for Page
         * @apiName GetHourlyAdStatsPage
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Page. Page ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Advertiser tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {String} publisher ObjectId of Publisher
         * @apiParam (Path Parameters) {String} site ObjectId of Site
         * @apiParam (Path Parameters) {String} page ObjectId of Page
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);
    router.route('/hourlyadstat/pub/:publisher/:site/:page/:placement')
        /**
         * @api {get} /hourlyadstat/pub/:publisher/:site/:page/:placement Get HourlyAdStats for Placement
         * @apiName GetHourlyAdStatsPlacement
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription Aggregate HourlyAdStats for a specific Placement. Placement ID will be added to `match` and `group` pipelines.
         *  Filtering & grouping by Advertiser tree entities is allowed.
         *
         *  **TODO** Path param-based endpoints are questionably useful, this may be deprecated in the future.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {String} publisher ObjectId of Publisher
         * @apiParam (Path Parameters) {String} site ObjectId of Site
         * @apiParam (Path Parameters) {String} page ObjectId of Page
         * @apiParam (Path Parameters) {String} placement ObjectId of placement
         * @apiParam (Query Parameters) {String} [publisher] Publisher ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [site] Site ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [page] Page ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [placement] Placement ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         */
        .get(publishers.hasAuthorization, aggregations.hourlyAdStat.getManyPublisher);

    /* ---- CLIQUE ROUTES ---- */
    router.route('/hourlyadstat/clique')
        /**
         * @api {get} /hourlyadstat/clique Get HourlyAdStats for Clique
         * @apiName GetHourlyAdStatsClique
         * @apiGroup Aggregation.HourlyAdStat
         * @apiDescription HourlyAdStat query endpoint specific for Cliques. Only accepts Clique-related query parameters
         *  for filtering & grouping.
         *
         *  **TODO** I don't even remember why this was useful, should probably be deprecated.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Query Parameters) {String} [adv_clique] Advertiser Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiParam (Query Parameters) {String} [pub_clique] Publisher Clique ObjectID, or CSV of IDs (see [Aggregations Primer](#api-Aggregations) for a list of available operators).
         * @apiUse queryParams
         *
         * @apiSuccess {Object[]} ::hourlyAdStats:: Array of aggregated HourlyAdStat records. See [above](#api-Aggregation_HourlyAdStat-GetHourlyAdStats) for schema details.
         *
         * @apiError (400 Bad Request) {String} message `Populate field not in group`: A field was supplied to `populate` which was
         *  not found in the `groupBy` field or found in path params.
         * @apiErrorExample {json} Error response:
         *      HTTP/1.1 400 Bad Request
         *      {
         *          "message": "Populate field not in group: placement"
         *      }
         *
         */
        .get(cliques.hasAuthorization, aggregations.hourlyAdStat.getManyClique);
};