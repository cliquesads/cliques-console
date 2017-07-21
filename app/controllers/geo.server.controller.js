/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var models = require('@cliques/cliques-node-utils').mongodb.models,
    config = require('config'),
	errorHandler = require('./errors.server.controller'),
    promise = require('bluebird'),
    request = require('request'),
    querystring = require('querystring'),
	_ = require('lodash');

var GOOGLE_GEOCODE_API_KEY = config.get('Google.apiKey');
var GoogleGeocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

// Constants to calculate zoomRatio for region
var baseFactor = 3.5;
var baseZoomRatio = 8000;

module.exports = function(db) {
    var geoModels = new models.GeoModels(db);
    request.promisifiedGet = promise.promisify(request.get);

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
            },
            /**
             * For a given country, get all its children, that is,
             * get all its cities populating the region field
             */
            getGeoChildren: function(req, res) {
                var geo = req.param('geo');
                try {
                    geo = JSON.parse(geo);
                } catch (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                }
                // Finding all geo children for a country, i.e. all cities with regions populated in this country
                return geoModels.City
                .find({country: geo.id})
                .populate('region')
                .exec(function(err, cities) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    }
                    return res.json(cities);
                });
            },
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
            },
            getCities: function (req, res) {
                var regionId = req.param('regionId');
                geoModels.City.find({
                    region: regionId 
                }, function(err, cities) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        return res.json(cities);
                    }
                });

            },
            updateRegionId: function (req, res) {
                geoModels.Region.find({
                    country: 'AUS'
                }, function(err, regions) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        regions.forEach(function(region) {
                            // Add a padding '0' in front of region index
                            var regionIndex = region._id.substring('AUS-'.length);
                            if (regionIndex.length === 1) {
                                var copiedRegionObject = JSON.parse(JSON.stringify(region));
                                copiedRegionObject._id = 'AUS-0' + copiedRegionObject._id.substring(4);
                                // Cannot update _id field to a document, have to create a 
                                // new document and then delete the old one
                                var updatedRegion = new geoModels.Region(copiedRegionObject);
                                updatedRegion.save(function(err, updatedRegion) {
                                    if (err) {
                                        return res.status(400).send({
                                            message: errorHandler.getAndLogErrorMessage(err)
                                        });
                                    }
                                });
                                region.remove(function(err) {
                                    if (err) {
                                        return res.status(400).send({
                                            message: errorHandler.getAndLogErrorMessage(err)
                                        });
                                    }
                                });
                            }
                        });
                        return res.status(200).send();
                    }
                });
            },
            /**
             * For an existed region, update its geo-coordinates
             */
            update: function (req, res) {
                var region = req.region;
                region = _.extend(region, req.body);

                if (!region.latitude || !region.longitude || !region.zoomRatio) {
                    // geo coords / map zoom ratio missing
                    // query Google Geocode API to get the latitude/longitude coordinates for this region
                    var queryUrl = GoogleGeocodeUrl + '?' + querystring.stringify({
                        address: region.name + ',' + region.country,
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
                                var viewport = geoInfo.results[0].geometry.viewport;
                                if (viewport) {
                                    // calculate the length of diagonal for the region from northeast to southwest
                                    var diagonal = Math.sqrt(Math.pow(viewport.northeast.lat - viewport.southwest.lat, 2) + Math.pow(viewport.northeast.lng - viewport.southwest.lng, 2));
                                    region.zoomRatio = baseZoomRatio * baseFactor / diagonal;
                                }
                            }
                        }
                        if (coordinates) {
                            // save this region with result coordinates in database
                            region.latitude = coordinates.lat;
                            region.longitude = coordinates.lng;
                            return region.save();
                        }
                    })
                    .then(function(savedRegion) {
                        return res.json(savedRegion);
                    })
                    .catch(function(err) {
                        return res.status(400).send(err);
                    });
                } else {
                    return region.save()
                    .then(function(savedRegion) {
                        return res.json(savedRegion);
                    })
                    .catch(function(err) {
                        return res.status(400).send(err);
                    });
                }
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
                return promise.each(cities, function(cityInfo) {
                    var city = new geoModels.City(cityInfo);

                    return geoModels.Region.findOne({
                        _id: cityInfo.region
                    })
                    .then(function(region) {
                        var regionName = region ? region.name : '';
                        // query Google Geocode API to get the latitude/longitude coordinates for this city
                        var queryUrl = GoogleGeocodeUrl + '?' + querystring.stringify({
                            address: city.name + ',' + regionName + ',' + city.country,
                            key: GOOGLE_GEOCODE_API_KEY
                        });
                        return request.promisifiedGet(queryUrl);
                    })
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
        },
    };
};
