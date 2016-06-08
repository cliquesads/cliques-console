/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(db, routers){
    var creativeassets = require('../controllers/creativeassets.server.controller')(db);
    var router = routers.apiRouter;
    router.route('/creativeassets')
        .post(upload.single('file'), creativeassets.create);
};
