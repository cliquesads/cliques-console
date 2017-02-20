/* jshint node: true */
'use strict';

module.exports = function(db, routers) {
	var screenshots = require('../controllers/screenshots.server.controller')(db);

	var router = routers.apiRouter;

	/* ---- Screenshot API routes ---- */
	router.route('/screenshot/getFilters')
		/**
		 * @api {get} /screenshot/getFilters Get all campaigns and sites for current signed in user's organization so user may select any of them that act as query filter when fetching screenshots
		 * @apiName GetFilters
		 * @apiDescription Get all campaigns and sites for current signed in user's organization so user may select any of them that act as query filter when fetching screenshots
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin
		 * @apiPermission advertiser
		 * @apiPermission publisher
		 *
		 * @apiSuccess Object with following structure:
		 * {
		 *  	campaigns: [
		 *			{
		 *     			name: 'someCampaignName',
		 * 		   		id: ObjectId("someCampaignObjectId")
		 *     		},
		 *			...
		 *     	],
		 *		sites: [
		 *			{
		 *				name: 'someSiteName',
		 *				id: ObjectId("someSiteName")
		 *			},
		 * 			...
		 * 		]
		 * }
		 */
		.get(screenshots.getScreenshotFilters);

	router.route('/screenshot/byAdvertiser')
		/**
		 * @api {get} /screenshot/byAdvertiser Get all screenshots that belong to current logged in user's advertiser
		 * @apiName ReadScreenshot
		 * @apiDescription Get all screenshots that belong to current logged in user's advertiser
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin
		 * @apiPermission advertiser
		 *
		 * @apiParam (Path Parameters){String} advertiserId Objectid of Advertiser
		 *
		 * @apiSuccess {[Object]} ::[screenshot]:: Matching Screenshot objects as response `body`
		 */
		.get(screenshots.hasAdvertiserType, screenshots.getManyByAdvertisers);

	router.route('/screenshot/byPublisher')
		/**
		 * @api {get} /screenshot/byPublisher Get all screenshots that belong to specific publisher
		 * @apiName ReadScreenshot
		 * @apiDescription Get all screenshots that belong to specific publisher
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin
		 * @apiPermission publisher
		 *
		 * @apiParam (Path Parameters){String} advertiserId Objectid of Advertiser
		 *
		 * @apiSuccess {[Object]} ::[screenshot]:: Matching Screenshot objects as response `body`
		 */
		.get(screenshots.hasPublisherType, screenshots.getManyByPublishers);
};