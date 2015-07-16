'use strict';

/**
 * Module dependencies.
 */
var models = require('cliques_node_utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

module.exports = function(db) {
    var geoModels = new models.GeoModels(db);

    return {
        /**
         * Get a single geo
         */
        readDma: function (req, res) {
            res.json(req.dma)
        },
        /**
         * Gets arbitrary number of DMAs
         */
        getManyDmas: function (req, res) {
            // this defaults to 10, kind of infuriating
            req.query.per_page = "1000000";
            geoModels.DMA.apiQuery(req.query, function (err, geos) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(geos);
                }
            });
        },
        dmaByID: function (req, res, next, id) {
            geoModels.DMA.findById(id).exec(function (err, dma) {
                if (err) return next(err);
                if (!dma) return next(new Error('Failed to load geo ' + id));
                req.dma = dma;
                next();
            });
        },
    };
};
