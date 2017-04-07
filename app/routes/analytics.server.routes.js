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

	router.route('/analytics/getAllCampaigns')
		/**
		 * @api {get} /analytics/getAllCampaigns Get all campaigns for current user's organization
		 * @apiName GetAllCampaigns
		 * @apiGroup - 
		 * @apiDescription Get all campaigns for current user's organization
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess {Object[]} ::Campaign:: Array of campaigns that belong to current user's organization
		 * @apiError (400 Bad Request) {String} error message
		 *
		 */
		.get(analytics.getAllCampaigns);

	router.route('/analytics/save')
		/**
		 * @api {get} /analytics/save save query in database
		 * @apiName saveQuery
		 * @apiGroup - 
		 * @apiDescription save query in database
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess String saved query ObjectId
		 * @apiError (400 Bad Request) {String} error message
		 *
		 */
		.post(analytics.save);

	router.route('/analytics/saveAdditionalSelectedHeaders')
		/**
		 * @api {get} /analytics/saveAdditionalSelectedHeaders save additional headers selected by user for specific query
		 * @apiName saveAdditionalSelectedHeaders
		 * @apiGroup - 
		 * @apiDescription save additional headers selected by user for specific query
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin/advertiser/publisher
		 *
		 * @apiParam -
		 * @apiSuccess -
		 * @apiError (400 Bad Request) {String} error message
		 *
		 */
		.post(analytics.saveAdditionalSelectedHeaders);
};