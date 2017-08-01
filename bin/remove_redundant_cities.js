'use strict';
var promise = require('bluebird'),
	models = require('@cliques/cliques-node-utils').mongodb.models;

require('./_main')(function(GLOBALS) {
	var mongoose = GLOBALS.mongoose,
		geoModels = new models.GeoModels(GLOBALS.db);

	geoModels.City.find({})
	.then(function(cities) {
		return promise.each(cities, function(city) {
			return geoModels.City.count({
				name: city.name,
				country: city.country,
				region: city.region
			})
			.then(function(redundantCount) {
				if (redundantCount > 1) {
					var cityInfo = {
						name: city.name,
						country: city.country,
						region: city.region,
					};
					if (city.latitude && city.longitude) {
						cityInfo.latitude = city.latitude;
						cityInfo.longitude = city.longitude;
					}
					var cityDoc = new geoModels.City(cityInfo);
					return geoModels.City.remove({
						name: city.name,
						country: city.country,
						region: city.region,
					})
					.then(function() {
						console.log('Redundant city: ' + city.name + ' removed.');
						return cityDoc.save();
					});
				}
			});
		})
		.then(function() {
			mongoose.disconnect();
			process.exit(0);
		})
		.catch(function(err) {
			mongoose.disconnect();
			console.error(err);
			process.exit(1);
		});
	});
})