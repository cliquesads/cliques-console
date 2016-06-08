/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(app, routers){
    var logos = require('../controllers/logos.server.controller')(app.db);
    var router = routers.apiRouter;
    router.route('/logos')
        .post(upload.single('file'), logos.create);
};
