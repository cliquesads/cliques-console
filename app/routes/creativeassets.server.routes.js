/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(app){
    var creativeassets = require('../controllers/creativeassets.server.controller')(app.db);

    app.route('/creativeassets')
        .post(users.requiresLogin, upload.single('file'), creativeassets.create);
};
