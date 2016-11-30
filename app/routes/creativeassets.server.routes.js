/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(db, routers){
    var creativeassets = require('../controllers/creativeassets.server.controller')(db);
    var router = routers.apiRouter;
    router.route('/creativeassets')
        /**
         * @api {post} /creativeassets Upload Creative Asset
         * @apiName UploadCreativeAsset
         * @apiGroup CreativeAsset
         * @apiDescription Uploads a Creative Asset (an image file that's served as an ad creative) to Google Cloud Storage,
         *  as well as local filesystem.
         *
         *
         *
         */
        .post(upload.single('file'), creativeassets.create);
};
