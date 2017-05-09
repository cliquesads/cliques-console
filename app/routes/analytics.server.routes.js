/* jshint node: true */ 'use strict';

module.exports = function(db, routers) {
	var router = routers.apiRouter;
	var analytics = require('../controllers/analytics.server.controller')(db);

    /**
     * @apiDefine QuerySchema
     * @apiParam (Body (Query Schema)) {ObjectId} [id]                 Query ID. Will be auto-generated for new queries.
     * @apiParam (Body (Query Schema)) {String} [createdAt=Date.now]   UTC timestamp for when query was created.
     * @apiParam (Body (Query Schema)) {String} [updatedAt=Date.now]   UTC timestamp for when query was last updated.
     * @apiParam (Body (Query Schema)) {String} name                   User-defined query name.
     * @apiParam (Body (Query Schema)) {String="time","sites","campaigns","creatives","placements","cities","states","countries","custom"} type  Query type
     * @apiParam (Body (Query Schema)) {ObjectId} user                 ObjectID of [User](#api-User) who ran this query.
     * @apiParam (Body (Query Schema)) {String} [groupBy]              Values passed to `groupBy` API query param
     * @apiParam (Body (Query Schema)) {String="day","month","hour"}   [dateGroupBy]Value passed to `dateGroupBy` API query param.
     * @apiParam (Body (Query Schema)) {String[]} [filters]            TODO: add field description
     * @apiParam (Body (Query Schema)) {String[]} [dataHeaders]        Data columns to be included in query results
     * @apiParam (Body (Query Schema)) {String} [dateRangeShortCode]   TODO: add field description
     * @apiParam (Body (Query Schema)) {String} [humanizedDateRange]   TODO: add field description
     * @apiParam (Body (Query Schema)) {Boolean} [isSaved=false]       Flag to indicate whether query shows up in user's My Queries & is cron'd
     * @apiParam (Body (Query Schema)) {String} [schedule]             Cron-syntax string describing schedule for when query should be run
     * @apiParam (Body (Query Schema)) {String} [nextRun]              If saved as periodic query, the next datetime this query will be executed again
     */

	/* ---- QUERY ROUTES ---- */
    router.param('queryId', analytics.query.queryByID);
	router.route('/query')
        /**
         * @api {post} /query Create new Query
         * @apiName createQuery
         * @apiGroup Query
         * @apiDescription Create a new Query object.
         *
         * A Query is a single query executed by a user against a particular aggregation endpoint, like [HourlyAdStat](#api-Aggregation_HourlyAdStat)
         * or [GeoAdStat](#api-Aggregation_GeoAdStat). The Query object persists the necessary state parameters to recreate the exact query run by
         * the user, so that it can be run again either via UI or script (e.g. via crontab).
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         * @apiUse QuerySchema
         *
         * @apiSuccess {Object} ::query:: Query object as response body, see
         *  [Query Schema](#api-Query)
         * @apiError (400 Bad Request) {String} error message
         *
         */
		.post(analytics.query.create)
        /**
         * @api {get} /query Get Many Queries (apiQuery)
         * @apiName GetRecentQueries
         * @apiGroup Query
         * @apiDescription Get all queries for logged in user. Supports all [apiQuery](https://github.com/ajb/mongoose-api-query)
         * parameters & filters, including pagination.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiSuccess {Object[]} ::Query:: Array of query objects that current user recently queried.
         * @apiError (400 Bad Request) {String} error message
         */
        .get(analytics.query.getMany);

    router.route('/query/:queryId')

        .get(analytics.query.read)
        /**
         * @api {patch} /query/:queryId Update query
         * @apiName updateQuery
         * @apiGroup Query
         * @apiDescription Update query object, passing new query object params as request body.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} queryId ObjectID of query to be updated
         * @apiParam (Body (Query Schema)) {Object} ::query:: Query object as request `body` (see [above](#api-Query) for all fields).
         *
         * @apiSuccess {Object} ::query:: Updated query object as response body, see
         *  [Query Schema](#api-Query)
         * @apiError (400 Bad Request) {String} error message
         */
        .patch(analytics.query.update)
        /**
         * @api {delete} /query/:queryId Delete query
         * @apiName deleteQuery
         * @apiGroup Query
         * @apiDescription Delete query object, passing query to delete object params as request body.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} queryId ObjectID of query to be deleted
         * @apiParam (Body (Query Schema)) {Object} ::query:: Query object as request `body` (see [above](#api-Query) for all fields).
         *
         * @apiSuccess {Object} ::query:: Deleted query object as response body, see
         *  [Query Schema](#api-Query)
         * @apiError (400 Bad Request) {String} error message
         */
        .delete(analytics.query.delete)
};