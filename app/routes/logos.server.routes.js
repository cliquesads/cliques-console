/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(app){
    var logos = require('../controllers/logos.server.controller')(app.db);
    app.route('/logos')
        .post(users.requiresLogin, upload.single('file'), logos.create);
};