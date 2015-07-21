'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
    multer = require('multer'),
    upload = multer({ dest: '../public/uploads/'}),
	_ = require('lodash');

module.exports = function(db) {
    //var advertiserModels = new models.AdvertiserModels(db);
    return {
        /**
         * Create new advertiser
         */
        create: function (req, res, next) {
            var user = req.user;
            res.status(200).send();
        }
    };
};
