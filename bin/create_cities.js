'use strict';
var promise = require('bluebird'),
	request = require('request'),
	querystring = require('querystring'),
	models = require('@cliques/cliques-node-utils').mongodb.models;

var GOOGLE_GEOCODE_API_KEY = 'AIzaSyAHdHwBq171vkQsdDqeX9lyCkkF8rj8Qj4';
var GoogleGeocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

require('./_main')(function(GLOBALS) {
	var mongoose = GLOBALS.mongoose;
	var geoModels = new models.GeoModels(GLOBALS.db);
	var GeoAdStat = mongoose.model('GeoAdStat');

	request.promisifiedGet = promise.promisify(request.get);

	var citiesInGeoAdstats, existedCities;
	// Get unique city names with country/region from geoadstats
	GeoAdStat.aggregate([
		{
			$group: {
				_id: "$city",
				country: {
					$first: "$country"
				},
				region: {
					$first: "$region"
				}
			}
		}
	])
	.then(function(geos) {
		citiesInGeoAdstats = geos;
		return geoModels.City.find({});
	})
	.then(function(cities) {
		// remove city objects that are already saved in database from citiesInGeoAdstats
		for (var j = 0; j < cities.length; j ++) {
			for (var i = 0; i < citiesInGeoAdstats.length; i ++) {
				if (citiesInGeoAdstats[i]._id === cities[j].name &&
					citiesInGeoAdstats[i].country === cities[j].country &&
					citiesInGeoAdstats[i].region === cities[j].region) {

					citiesInGeoAdstats.splice(i, 1);
					break;
				}
			}
		}

		// now citiesInGeoAdstats contains ONLY cities that are not yet saved in database 
		return promise.each(citiesInGeoAdstats, function(cityGeo) {
			// query Google Geocode API to get the latitude/longitude coordinates for this city
			var queryUrl = GoogleGeocodeUrl + '?' + querystring.stringify({
			    address: cityGeo._id + ',' + cityGeo.country,
			    key: GOOGLE_GEOCODE_API_KEY
			});
			return request.promisifiedGet(queryUrl)
			.then(function(response) {
				var coordinates;
				var geoInfo = JSON.parse(response.body);

				if (geoInfo.error_message) {
					// promise reject since error occurs
					return promise.reject(geoInfo.error_message);
				}

				if (geoInfo.results.length > 0) {
					if (geoInfo.results[0].geometry) {
						coordinates = geoInfo.results[0].geometry.location;
					}
				}
				if (coordinates) {
					// save this city with result coordinates in database
					var newCity = new geoModels.City({
						name: cityGeo._id,
						country: cityGeo.country,
						region: cityGeo.region,
						latitude: coordinates.lat,
						longitude: coordinates.lng
					});
					return newCity.save();
				}
			});
		})
		.then(function() {
			mongoose.disconnect();
			process.exit(0);
		});
	})
	.catch(function(err) {
	    mongoose.disconnect();
		console.error(err);
		process.exit(1);
	});
});