/* jshint node: true */
'use strict';

module.exports = function(db, routers) {
	var screenshots = require('../controllers/screenshots.server.controller')(db);

	var router = routers.apiRouter;

	/* ---- Screenshot API routes ---- */

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

	router.route('/screenshot/completeModelIds')
		.get(screenshots.completeModelIdsForScreenshots);

};