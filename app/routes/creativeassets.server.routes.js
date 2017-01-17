/* jshint node: true */ 'use strict';
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(db, routers){
    var users = require('../controllers/users.server.controller')(db);
    var creativeassets = require('../controllers/creativeassets.server.controller')(db);
    var router = routers.apiRouter;
    router.route('/creativeassets')
        /**
         * @api {post} /creativeassets Upload Creative Asset
         * @apiName UploadCreativeAsset
         * @apiGroup CreativeAsset
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiDescription Uploads a single Creative Asset (an image file that's served as an ad creative) to Google Cloud Storage,
         *  as well as local filesystem (currently stores files locally under public/uploads only for backup).
         *
         * @apiParam (multipart/form-data) {File} CreativeAsset File object representing creative asset. No validation
         *  is currently performed server-side on this file, so make sure it is a valid creative file before uploading.
         *
         * @apiSuccess {Object} responseBody
         * @apiSuccess {String} responseBody.url Google Cloud Storage URL of newly uploaded file.
         */
        .post(upload.single('file'), creativeassets.create);
};
