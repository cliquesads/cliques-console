'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(app){
    var advertisers = require('../controllers/advertisers.server.controller')(app.db);

    /* ---- Advertiser API Routes ---- */
    app.route('/advertiser')
        .get(users.requiresLogin, advertisers.getMany)
        .put(users.requiresLogin, advertisers.hasAuthorization, advertisers.updateOrCreate)
        .post(users.requiresLogin, advertisers.hasAuthorization, advertisers.create);

    app.route('/advertiser/:advertiserId')
        .get(users.requiresLogin, advertisers.hasAuthorization, advertisers.read)
        .patch(users.requiresLogin, advertisers.hasAuthorization, advertisers.update)
        .delete(users.requiresLogin, advertisers.hasAuthorization, advertisers.remove);

    app.param('advertiserId', advertisers.advertiserByID);
};
