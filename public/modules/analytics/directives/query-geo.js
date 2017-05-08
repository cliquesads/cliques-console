/**
 * Created by Chuoxian Yang on 24/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGeo', [
	'Analytics',
	'$rootScope',
	'$filter',
	'City',
	function(
		Analytics,
		$rootScope,
		$filter,
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
				var assignBubbleRadius = function(impsValue, highestImps) {
					var bubbleRadius;
					if (impsValue < (highestImps / 5)) {
						bubbleRadius = 5;	
					} else if (impsValue < 2 * (highestImps / 5)) {
						bubbleRadius = 10;	
					} else if (impsValue < 3 * (highestImps / 5)) {
						bubbleRadius = 15;
					} else if (impsValue < 4 * (highestImps / 5)) {
						bubbleRadius = 20;
					} else {
						bubbleRadius = 25;
					}
					return bubbleRadius;
				};

				scope.$on('queryStarted', function(event, args) {
					scope.isLoading = true;
				});
				scope.$on('queryError', function(event, args) {
					scope.isLoading = false;
				});
				scope.$on('queryEnded', function(event, args) {
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
					switch(scope.queryParam.type) {
						case 'country':
							scope.mapObject.scope = 'world';
							scope.mapAvailable = true;
							// update map data
							scope.mapObject.data = mapData;
							scope.isLoading = false;
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
							break;
						case 'city':
							if (scope.queryParam.country === 'USA') {
								scope.mapObject.scope = 'usa';
								scope.mapAvailable = true;

								City.query({
									name: '{in}' + cityNames.join(','),
									country: scope.queryParam.country,
									region: scope.queryParam.region
								}).$promise.then(function(response) {
									var cities = response;
									var bombs = [];
									cities.forEach(function(city) {
										var data = cityStats[city.name];
										bombs.push({
											name: city.name,
											radius: assignBubbleRadius(data.imps, highestImpressions),
											yield: 400,
											imps: data.imps,
											clicks: data.clicks,
											country: 'USA',
											fillKey: assignColorCode(cityStats.imps, highestImpressions),
											latitude: city.latitude,
											longitude: city.longitude
										});
									});
									//draw bubbles for bombs
									scope.mapPlugins = {
										bubbles: null,
										customLegend: function(layer, data, options) {
											var html = ['<ul class="list-inline">'];
											html.push('</ul>');
											d3.select(this.options.element).append('div')
											.attr('class', 'datamaps-legend')
											.html(html.join(''));
										}
									};
									scope.mapPluginData = {bubbles: bombs};
									scope.isLoading = false;
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
