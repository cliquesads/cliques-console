/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('@cliques/cliques-node-utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
	_ = require('lodash');

module.exports = function(db) {
    var geoModels = new models.GeoModels(db);

    return {
        dma: {
            /**
             * Get a single DMA
             */
            readDma: function (req, res) {
                res.json(req.dma);
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
                            message: errorHandler.getAndLogErrorMessage(err)
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
            }
        },
        country: {
            /**
             * Get a single region
             */
            readCountry: function (req, res) {
                res.json(req.country);
            },
            /**
             * Gets arbitrary number of regions
             */
            getManyCountries: function (req, res) {
                // this defaults to 10, kind of infuriating
                req.query.per_page = "1000000";
                geoModels.Country.apiQuery(req.query, function (err, geos) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json(geos);
                    }
                });
            },
            countryByID: function (req, res, next, id) {
                geoModels.Country.findById(id).exec(function (err, country) {
                    if (err) return next(err);
                    if (!country) return next(new Error('Failed to load geo ' + id));
                    req.country = country;
                    next();
                });
            }
        },
        region: {
            /**
             * Get a single region
             */
            readRegion: function (req, res) {
                res.json(req.region);
            },
            /**
             * Gets arbitrary number of regions
             */
            getManyRegions: function (req, res) {
                // this defaults to 10, kind of infuriating
                req.query.per_page = "1000000";
                geoModels.Region.apiQuery(req.query, function (err, geos) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json(geos);
                    }
                });
            },
            regionByID: function (req, res, next, id) {
                geoModels.Region.findById(id).exec(function (err, region) {
                    if (err) return next(err);
                    if (!region) return next(new Error('Failed to load geo ' + id));
                    req.region = region;
                    next();
                });
            }
        },
        city: {
            /**
             * Gets many cities with given city names as request parameter
             */
            getManyCities: function (req, res) {
                req.query.per_page = "1000000";
                geoModels.City.apiQuery(req.query, function (err, cities) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json(cities);
                    }
                });
            }
        }
    };
};
