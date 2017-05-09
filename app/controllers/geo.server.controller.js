/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('@cliques/cliques-node-utils').mongodb.models,
	errorHandler = require('./errors.server.controller'),
    promise = require('bluebird'),
    request = require('request'),
    querystring = require('querystring'),
	_ = require('lodash');

var GOOGLE_GEOCODE_API_KEY = 'AIzaSyDKFINMOSHXRJzRVy4ZufnSpGvFiXeaz1c';
var GoogleGeocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

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
            },
            /**
             * Create new city(cities) by querying Geocode api service to get city(cities) coordinates
             */
            create: function (req, res) {
                var cities;
                var savedCities = [];
                if (req.body.length >= 1) {
                    // batch cities creation
                    cities = req.body;
                } else {
                    // single city creation
                    cities = [req.body];
                }
                request.promisifiedGet = promise.promisify(request.get);
                return promise.each(cities, function(cityInfo) {
                    var city = new geoModels.City(cityInfo);
                    // query Google Geocode API to get the latitude/longitude coordinates for this city
                    var queryUrl = GoogleGeocodeUrl + '?' + querystring.stringify({
                        address: city.name + ',' + city.region + ',' + city.country,
                        key: GOOGLE_GEOCODE_API_KEY
                    });
                    return request.promisifiedGet(queryUrl)
                    .then(function(response) {
                        var coordinates;
                        var geoInfo = JSON.parse(response.body);

                        if (geoInfo.error_message) {
                            return promise.reject(geoInfo.error_message);
                        }

                        if (geoInfo.results.length > 0) {
                            if (geoInfo.results[0].geometry) {
                                coordinates = geoInfo.results[0].geometry.location;
                            }
                        }
                        if (coordinates) {
                            // save this city with result coordinates in database
                            city.latitude = coordinates.lat;
                            city.longitude = coordinates.lng;
                            return city.save();
                        }
                    })
                    .then(function(savedCity) {
                        savedCities.push(savedCity);
                    });
                })
                .then(function() {
                    return res.json(savedCities);
                })
                .catch(function(err) {
                    return res.status(400).send(err);
                });
            }
        }
    };
};
