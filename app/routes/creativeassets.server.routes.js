'use strict';
var users = require('../controllers/users.server.controller');
var multer = require('multer');
var upload = multer({ dest: 'public/uploads/'});

module.exports = function(app){
    var creativeassets = require('../controllers/creativeassets.server.controller')(app.db);

    app.route('/creativeassets')
        .get(users.requiresLogin, function(req, res){ res.send('CreativeAssets')});

    /* ---- Advertiser API Routes ---- */
    app.route('/creativeassets/:advertiser/:campaign')
        .get(users.requiresLogin, function(req, res){ res.send('advertiser: ' + req.params.advertiser + ' campaign: ' + req.params.campaign)})
        .post(users.requiresLogin, upload.single('file'), creativeassets.create);
};
