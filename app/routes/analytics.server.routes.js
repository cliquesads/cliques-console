/* jshint node: true */ 'use strict';

module.exports = function(db, routers) {
	var router = routers.apiRouter;
	var analytics = require('../controllers/analytics.server.controller')(db);

	/* ---- ANALYTICS ROUTES ---- */
	router.route('/analytics/recentQueries')
		/**
		 * @api {get} /analytics/recentQueries Get recent queries for current logged in user
		 * @apiName GetRecentQueries
		 * @apiGroup -
		 * @apiDescription Get recent queries for current logged in user
		 *
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess {Object[]} ::Query:: Array of query objects that current user recently queried.
		 * @apiError (400 Bad Request) {String} error message
		 * 
		 */
		.get(analytics.getRecentQueries);
	router.route('/analytics/customQueries')
		/**
		 * @api {get} /analytics/customQueries Get queries with name as 'custom' for current logged in user
		 * @apiName GetCustomQueries
		 * @apiGroup -
		 * @apiDescription Get queries with name as 'custom' for current logged in user
		 *
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess {Object[]} ::Query:: Array of query objects that current user customzied 
		 * @apiError (400 Bad Request) {String} error message
		 * 
		 */
		.get(analytics.getCustomQueries);
	router.route('/analytics/getAllCreatives')
		/**
		 * @api {get} /analytics/getAllCreatives Get all creatives for current user's organization
		 * @apiName GetAllCreatives
		 * @apiGroup - 
		 * @apiDescription Get all creatives for current user's organization
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess {Object[]} ::Creative:: Array of creatives that belong to current user's organization
		 * @apiError (400 Bad Request) {String} error message
		 *
		 */
		.get(analytics.getAllCreatives);
	router.route('/analytics/getAllSites')
		/**
		 * @api {get} /analytics/getAllSites Get all sites for current user's organization
		 * @apiName GetAllSites
		 * @apiGroup - 
		 * @apiDescription Get all sites for current user's organization
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess {Object[]} ::Creative:: Array of sites that belong to current user's organization
		 * @apiError (400 Bad Request) {String} error message
		 *
		 */
		.get(analytics.getAllSites);
};