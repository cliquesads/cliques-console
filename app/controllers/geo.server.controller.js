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

        /**
         * For a given geo id(s), get itself and all its children in a tree format
         */
        getGeoTrees: function(req, res) {
            var geos = req.param('geos');
            if (typeof geos === 'string') {
                geos = [geos];
            }

            var geoTrees = [];
            return promise.each(geos, function(geoString) {
                var geo = JSON.parse(geoString);
                var tree, countryObj, regionObj, cityObj;
                if (geo.type === 'country') {
                    return geoModels.Country.findOne({_id: geo.id})
                    .then(function(country) {
                        if (!country) {
                            return promise.reject(new Error('Country not found'));
                        }
                        countryObj = country;
                        return geoModels.Region.find({country: countryObj._id})
                        .then(function(regions) {
                            tree = {
                                _id: countryObj._id,
                                name: countryObj.name,
                                regions: JSON.parse(JSON.stringify(regions))
                            };
                            geoTrees.push(tree);
                        });
                    });
                } else if (geo.type === 'region') {
                    return geoModels.Region.findOne({_id: geo.id})
                    .then(function(region) {
                        if (!region) {
                            return promise.reject(new Error('Region not found'));
                        }
                        regionObj = JSON.parse(JSON.stringify(region));
                        return geoModels.Country.findOne({_id: region.country});
                    })
                    .then(function(country) {
                        countryObj = country;
                        return geoModels.City.find({
                            country: country._id,
                            region: regionObj._id
                        });
                    })
                    .then(function(cities) {
                        regionObj.cities = cities;
                        // Check if such country node already exists in geoTrees
                        var hasThisCountry = false;
                        for (var i = 0; i < geoTrees.length; i ++) {
                            if (geoTrees[i]._id === countryObj._id) {
                                hasThisCountry = true;
                                // Check if such region already exists in this country in geoTrees
                                var hasThisRegion = false;
                                for (var j = 0; j < geoTrees[i].regions.length; j ++) {
                                    if (geoTrees[i].regions[j]._id === regionObj._id) {
                                        geoTrees[i].regions[j] = regionObj;
                                        hasThisRegion = true;
                                        break;
                                    }
                                }
                                if (!hasThisRegion) {
                                    geoTrees[i].regions.push(regionObj);
                                }
                            }
                        }
                        if (!hasThisCountry) {
                            tree = {
                                _id: countryObj._id,
                                name: countryObj.name,
                                regions: [regionObj]
                            };
                            geoTrees.push(tree);
                        }
                    });
                } else if (geo.type === 'city') {
                    return geoModels.City.findOne({_id: geo.id})
                    .then(function(city) {
                        if (!city) {
                            return promise.reject(new Error('City not found'));
                        }
                        cityObj = city;
                        return geoModels.Region.findOne({_id: cityObj.region});
                    })
                    .then(function(region) {
                        regionObj = JSON.parse(JSON.stringify(region));
                        regionObj.cities = [cityObj];
                        return geoModels.Country.findOne({_id: cityObj.country});
                    })
                    .then(function(country) {
                        // Check if such country already exists in geoTrees
                        var hasThisCountry = false;
                        for (var i = 0; i < geoTrees.length; i ++) {
                            if (country._id === geoTrees[i]._id) {
                                hasThisCountry = true;
                                // Check if such region already exists in geoTrees in this country
                                var hasThisRegion = false;
                                for (var j = 0; j < geoTrees[i].regions.length; j ++) {
                                    if (regionObj._id === geoTrees[i].regions[j]._id) {
                                        hasThisRegion = true;
                                        // Check if such city already exists in geoTrees in this region
                                        var hasThisCity = false;
                                        if (geoTrees[i].regions[j].cities) {
                                            for (var k = 0; k < geoTrees[i].regions[j].cities.length; k ++) {
                                                if (geoTrees[i].regions[j].cities[k]._id.toString() === cityObj._id.toString()) {
                                                    hasThisCity = true; 
                                                    break;
                                                } 
                                            }
                                        } else {
                                            geoTrees[i].regions[j].cities = [cityObj];
                                            hasThisCity = true;
                                        }
                                        if (!hasThisCity) {
                                            geoTrees[i].regions[j].cities.push(cityObj);
                                        }
                                        break;
                                    }
                                }
                                if (!hasThisRegion) {
                                    geoTrees[i].regions.push(regionObj);
                                }
                                break;
                            }
                        }
                        if (!hasThisCountry) {
                            tree = {
                                _id: country._id,
                                name: country.name,
                                regions: [regionObj]
                            };
                            geoTrees.push(tree);
                        }
                    });
                }
            })
            .then(function() {
                res.json(geoTrees);
            })
            .catch(function(err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            });
        }
    };
};
