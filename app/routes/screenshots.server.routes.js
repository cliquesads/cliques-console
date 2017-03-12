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

	router.route('/screenshot')
		/**
		 * @api {get} /screenshot Get all screenshots that belong to current logged in user's advertiser or publisher
		 * @apiName GetScreenshots
		 * @apiDescription Get all screenshots that belong to current logged in user's advertiser or publisher
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin
		 * @apiPermission advertiser
		 * @apiPermission publisher
		 *
		 * @apiParam (Path Parameters){String} advertiserId Objectid of Advertiser
		 *
		 * @apiSuccess {[Object]} ::[screenshot]:: Matching Screenshot objects as response `body`
		 */
		.get(screenshots.getMany);

	router.route('/screenshot/:screenshotId')
		/**
		 * @api {get} /screenshot/:screenshotId Get individual screenshot by Id
		 * @apiName ReadScreenshot
		 * @apiDescription Get single screenshot by ID
		 * @apiVersion 0.1.0
		 * @apiPermission networkAdmin
		 * @apiPermission advertiser
		 * @apiPermission publisher
		 *
		 * @apiParam (Path Parameters){String} screenshotId Objectid of Screenshot
		 *
		 * @apiSuccess {[Object]} ::screenshot:: Matching Screenshot object as response `body`
		 */
		.get(screenshots.hasAuthorization, screenshots.read);

	router.route('/screenshot/:screenshotId/report')
		.post(screenshots.hasAuthorization, screenshots.reportScreenshot);

	router.param('screenshotId', screenshots.screenshotByID);
};