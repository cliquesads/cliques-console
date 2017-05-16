/**
 * Created by Chuoxian Yang on 24/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGeo', [
	'Analytics',
	'$rootScope',
	'$filter',
	'$state',
	'Region',
	'City',
	function(
		Analytics,
		$rootScope,
		$filter,
		$state,
		Region,
		City
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {},
			templateUrl: 'modules/analytics/views/partials/query-geo.html',
			link: function(scope, element, attrs) {
				scope.user = user;
				scope.isLoading = true;

				var mapFillColors = {
					EXTREME: '#CC4731',
					HIGH: '#9764BC',
					MEDIUM: '#306596',
					LOW: '#667FAF',
					LESSER: '#A5DEA5',
					defaultFill: '#DDDDDD'
				};
				var popupTemplate = function(geo, data) {
					var CTR = data.imps ? $filter('percentage')(data.clicks / data.imps, 2): '0';
					return ['<div class="hoverinfo">',
							data.name + '<br>',
							'<strong>Impressions: ' + data.imps + '</strong><br>',
							'<strong>CTR: ' + CTR + '</strong>',
							'</div>'].join('');
				};
				var assignColorCode = function(impsValue, highestImps) {
					var mapColorCode;
					if (impsValue < (highestImps / 5)) {
						mapColorCode = 'LESSER';	
					} else if (impsValue < 2 * (highestImps / 5)) {
						mapColorCode = 'LOW';	
					} else if (impsValue < 3 * (highestImps / 5)) {
						mapColorCode = 'MEDIUM';
					} else if (impsValue < 4 * (highestImps / 5)) {
						mapColorCode = 'HIGH';
					} else {
						mapColorCode = 'EXTREME';
					}
					return mapColorCode;
				};
				var getBubbleData = function(city, data, highestImps) {
					var bubbleRadius;
					if (data.imps < (highestImps / 5)) {
						bubbleRadius = 5;	
					} else if (data.imps < 2 * (highestImps / 5)) {
						bubbleRadius = 10;	
					} else if (data.imps < 3 * (highestImps / 5)) {
						bubbleRadius = 15;
					} else if (data.imps < 4 * (highestImps / 5)) {
						bubbleRadius = 20;
					} else {
						bubbleRadius = 25;
					}
					return {
						name: city.name,
						radius: bubbleRadius,
						yield: 400,
						imps: data.imps,
						clicks: data.clicks,
						country: 'USA',
						fillKey: assignColorCode(data.imps, highestImps),
						latitude: city.latitude,
						longitude: city.longitude
					};
				};
				var translateFillKeys = function(fillKey) {
					var impsExtentString;
					switch (fillKey) {
						case 'EXTREME':
							impsExtentString = 'Most impressions';
							break;
						case 'HIGH':
							impsExtentString = 'High impressions';
							break;
						case 'MEDIUM':
							impsExtentString = 'Some impressions';
							break;
						case 'LOW':
							impsExtentString = 'Low impressions';
							break;
						case 'LESSER':
							impsExtentString = 'Very low impressions';
							break;
						case 'defaultFill':
							impsExtentString = 'No impressions';
							break;
						default:
							break;
					}
					return impsExtentString;
				};
				var constructSetProjectionFunc = function(centerCoordinates, zoomRatio) {
					scope.mapObject.setProjection = function(element) {
						var projection = d3.geo.equirectangular()
							.center(centerCoordinates)
							.scale(zoomRatio)
							.translate([element.offsetWidth / 2, element.offsetHeight / 2]);
						var path = d3.geo.path().projection(projection);
						return {path: path, projection: projection};
					};
				};

				scope.mapClicked = function(geography) {
					if (scope.queryParam.type === 'country') {
						// country clicked, should go to region query
						$state.go('app._analytics.analytics.quickQueries.state', {
							countryId: geography.id
						});
					} else if (scope.queryParam.type === 'state') {
						// region clicked, should go to city query
						$state.go('app._analytics.analytics.quickQueries.city', {
							regionId: geography.id
						});
					} else if (scope.queryParam.type === 'city') {
						// if another region clicked, should go to city query with the clicked region
						if (scope.currentCountry._id + '-' + scope.currentRegion._id !== geography.id) {
							$state.go('app._analytics.analytics.quickQueries.city', {
								regionId: geography.id
							});
						}
					}
				};

				scope.$on('queryStarted', function(event, args) {
					scope.isLoading = true;
				});
				scope.$on('queryError', function(event, args) {
					scope.isLoading = false;
				});
				scope.$on('queryEnded', function(event, args) {
					scope.currentCountry = args.country;
					scope.currentRegion = args.region;

					scope.queryParam = args.queryParam;
					scope.humanizedDateRange = scope.queryParam.humanizedDateRange;
					scope.geoQueryResults = args.results;

					var mapData = {};
					var highestImpressions = 0;

					// `city` quick query specific variables
					var cityNames = [];
					var cityStats = {};

					// get highest impressions;
					scope.geoQueryResults.forEach(function(row) {
						if (row.imps > highestImpressions) {
							highestImpressions = row.imps;
						}
					});
					// get map color and data for each country/region/city
					scope.geoQueryResults.forEach(function(row) {
						if (row._id.country) {
							mapData[row._id.country._id] = {
								name: row._id.country.name,
								fillKey: assignColorCode(row.imps, highestImpressions),
								imps: row.imps,
								clicks: row.clicks
							};
						} else if (row._id.region) {
							mapData[row._id.region.code] = {
								name: row._id.region.name,
								fillKey: assignColorCode(row.imps, highestImpressions),
								imps: row.imps,
								clicks: row.clicks
							};
						} else if (row._id.city) {
							cityNames.push(row._id.city);
							cityStats[row._id.city] = {
								imps: row.imps,
								clicks: row.clicks
							};
						}
					});
					// prepare for mapObject
					scope.mapObject = {
						options: {
							width: 1110,
							legendHeight: 60 // optionally set the padding for the legend
						},
						geographyConfig: {
							highlighBorderColor: '#EAA9A8',
							highlighBorderWidth: 2,
							popupTemplate: popupTemplate
						},
						bubblesConfig: {
							popupTemplate: popupTemplate
						},
						fills: mapFillColors
					};
					// map plugins - legend & bubbles
					scope.mapPlugins = {
						customLegend: function(layer, data, options) {
							var html = ['<ul class="list-inline">'],
							label = '';
							for (var fillKey in this.options.fills) {
								html.push('<li class="key" ',
								'style="border-top: 10px solid ' + this.options.fills[fillKey] + '">',
								translateFillKeys(fillKey),
								'</li>');
							}
							html.push('</ul>');
							d3.select(this.options.element).append('div')
							.attr('class', 'datamaps-legend')
							.html(html.join(''));
						}
					};
					switch (scope.queryParam.type) {
						case 'country':
							scope.mapObject.scope = 'world';
							scope.mapAvailable = true;
							// update map data
							scope.mapObject.data = mapData;
							scope.isLoading = false;
							scope.postTitle = "World";
							break;
						case 'state':
							if (scope.queryParam.country === 'USA') {
								scope.mapObject.scope = 'usa';
								scope.mapAvailable = true;
								// update map data
								scope.mapObject.data = mapData;
							} else {
								// map only available for world map and USA map
								scope.mapAvailable = false;
							}
							scope.isLoading = false;
							scope.postTitle = scope.currentCountry.name + " State";
							break;
						case 'city':
							if (scope.queryParam.country === 'USA') {
								scope.mapObject.scope = 'usa';
								scope.mapAvailable = true;
								scope.postTitle = scope.currentCountry.name + " > " + scope.currentRegion.name;

								City.query({
									name: '{in}' + cityNames.join(','),
									country: scope.queryParam.country,
									region: scope.queryParam.region
								}).$promise.then(function(response) {
									var cities = response;
									scope.bombs = [];
									cities.forEach(function(city) {
										if (cityStats[city.name]){
											scope.bombs.push(getBubbleData(city, cityStats[city.name], highestImpressions));
											// remove this city from cityStats since it's been used
											delete cityStats[city.name];
										}
									});

									// Now cityStats ONLY contains cities that haven't stored in server side database yet, need to create and store these cities
									var notStoredCities = [];
									angular.forEach(cityStats, function(data, cityName) {
										notStoredCities.push({
											name: cityName,
											country: scope.queryParam.country,
											region: scope.queryParam.region
										});
									});
									if (notStoredCities.length > 0) {
										// Batch create these missing cities
										City.create(notStoredCities)
										.$promise.then(function(response) {
											var newCities = response;
											angular.forEach(newCities, function(newCity, key) {
												scope.bombs.push(
													newCity,
													cityStats[newCity.name],
													highestImpressions
												);
											});
										});
									}
									//draw bubbles for scope.bombs
									scope.mapPlugins.bubbles = null;
									scope.mapPluginData = {bubbles: scope.bombs};

									// zoom in map to show current region
									var zoomInCenterCoords;
									if (scope.currentRegion.latitude &&
										scope.currentRegion.longitude &&
										scope.currentRegion.zoomRatio) {
										zoomInCenterCoords = [
											scope.currentRegion.longitude,	
											scope.currentRegion.latitude
										];
										constructSetProjectionFunc(zoomInCenterCoords, scope.currentRegion.zoomRatio);
										scope.isLoading = false;
									} else {
										// current region doesn't have geo coordinates yet, need to update
										new Region(scope.currentRegion).$update()
										.then(function(response) {
											if (response.latitude && response.longitude) {
												zoomInCenterCoords = [
													response.longitude,
													response.latitude
												];
												if (!response.zoomRatio) {
													// If region zoomRatio doesn't get updated, set to a default value
													response.zoomRatio = 6000;
												}
												constructSetProjectionFunc(zoomInCenterCoords, response.zoomRatio);
											}
											scope.isLoading = false;
										});
									}
								});
							} else {
								// map only available for world map and USA map
								scope.mapAvailable = false;
								scope.isLoading = false;
							}
							break;
						default:
							break;
					}
				});
			}
		};
	}
]);
