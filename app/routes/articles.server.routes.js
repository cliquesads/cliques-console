/* jshint node: true */
'use strict';

module.exports = function(db, routers) {
    const articles = require('../controllers/articles.server.controller')(db);
    const router = routers.apiRouter;

    router.param('articleId', articles.articleByID);

    router.route('/article')
        /**
         * @api {get} /screenshot Get All Screenshots
         * @apiName GetAllScreenshots
         * @apiGroup Screenshot
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
        .get(articles.getMany);

    router.route('/article/:articleId')
        /**
         * @api {get} /screenshot/:screenshotId Get Screenshot
         * @apiName ReadScreenshot
         * @apiGroup Screenshot
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
        .get(articles.hasAuthorization, articles.read);
};