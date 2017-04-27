/* jshint node: true */ 'use strict';

module.exports = function(db, routers) {
	var router = routers.apiRouter;
	var analytics = require('../controllers/analytics.server.controller')(db);

	/* ---- QUERY ROUTES ---- */
    router.param('queryId', analytics.query.queryByID);
	router.route('/query')
        /**
         * @api {post} /query Create new query
         * @apiName createQuery
         * @apiGroup Query
         * @apiDescription Create a new query object.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam -
         * @apiSuccess String saved query ObjectId
         * @apiError (400 Bad Request) {String} error message
         *
         */
		.post(analytics.query.create)
        /**
         * @api {get} /query Get Many Queries
         * @apiName GetRecentQueries
         * @apiGroup Query
         * @apiDescription Get all queries for logged in user
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin/advertiser/publisher
         *
         * @apiParam -
         * @apiSuccess {Object[]} ::Query:: Array of query objects that current user recently queried.
         * @apiError (400 Bad Request) {String} error message
         */
        .get(analytics.query.getMany);

    router.route('/query/:queryId')
        .get(analytics.query.read)
        /**
         * @api {patch} /query/:queryId Update query
         * @apiName saveAdditionalSelectedHeaders
         * @apiGroup -
         * @apiDescription save additional headers selected by user for specific query
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin/advertiser/publisher
         *
         * @apiParam -
         * @apiSuccess -
         * @apiError (400 Bad Request) {String} error message
         */
        .patch(analytics.query.update);


	router.route('/query/myQueries')
		/**
		 * @api {get} /analytics/myQueries Get queries saved by current logged in user
		 * @apiName GetMyQueries
		 * @apiGroup -
		 * @apiDescription Get queries saved by current logged in user
		 *
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess {Object[]} ::Query:: Array of query objects that current user saved 
		 * @apiError (400 Bad Request) {String} error message
		 * 
		 */
		.get(analytics.query.getMyQueries);

	router.route('/analytics/getRegions')
		/**
		 * @api {get} /analytics/getRegions get regions for specific country from database
		 * @apiName getRegions
		 * @apiGroup -
		 * @apiDescription get regions for specific country from database
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam (Path Parameters){String} country name
		 * @apiVersion 0.1.0
		 * @apiSuccess [Object] region objects
		 * @apiError (400 Bad Request) {String} error message
		 *
		 */
		.get(analytics.getRegions);
};