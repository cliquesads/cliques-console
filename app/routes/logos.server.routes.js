/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(db, routers){
    var logos = require('../controllers/logos.server.controller')(db);
    var router = routers.apiRouter;
    router.route('/logos')
        /**
         * @api {post} /logos Upload Organization Logo
         * @apiName UploadLogo
         * @apiGroup Logo
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiDescription Uploads a single logo (an image file that represents an Organization logo) to Google Cloud Storage,
         *  as well as local filesystem (currently stores files locally under public/uploads only for backup).
         *
         * TODO: This really belongs under the [Organization](#api-Organization) namespace instead of having its own.
         *
         * @apiParam (multipart/form-data) {File} Logo File object representing org logo. No validation
         *  is currently performed server-side on this file, so make sure it is a valid logo before uploading.
         *
         * @apiSuccess {Object} responseBody
         * @apiSuccess {String} responseBody.url Google Cloud Storage URL of newly uploaded file.
         */
        .post(upload.single('file'), logos.create);
};
