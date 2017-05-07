/**
 * Created by Chuoxian Yang on 24/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGeo', [
	'Analytics',
	'$rootScope',
	'$filter',
	function(
		Analytics,
		$rootScope,
		$filter
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {},
			templateUrl: 'modules/analytics/views/partials/query-geo.html',
			link: function(scope, element, attrs) {
				scope.user = user;
				scope.isLoading = true;

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
				scope.$on('queryStarted', function(event, args) {
					scope.isLoading = true;
				});
				scope.$on('queryError', function(event, args) {
					scope.isLoading = false;
				});
				scope.$on('queryEnded', function(event, args) {
					scope.isLoading = false;
					scope.queryParam = args.queryParam;
					scope.humanizedDateRange = scope.queryParam.humanizedDateRange;
					scope.geoQueryResults = args.results;

					var mapData = {};
					var highestImpressions = 0;
					// get highest impressions;
					scope.geoQueryResults.forEach(function(row) {
						if (row.imps > highestImpressions) {
							highestImpressions = row.imps;
						}
					});
					// get map color and data for each country
					scope.geoQueryResults.forEach(function(row) {
						if (row._id.country) {
							mapData[row._id.country._id] = {
								fillKey: assignColorCode(row.imps, highestImpressions),
								imps: row.imps,
								clicks: row.clicks
							};
						} else if (row._id.region) {
							mapData[row._id.region.code] = {
								fillKey: assignColorCode(row.imps, highestImpressions),
								imps: row.imps,
								clicks: row.clicks
							};
						}
					});
					// prepare for mapObject
					if (scope.queryParam.type === 'country') {
						scope.mapScope = 'world';
					} else if (scope.queryParam.type === 'state' || scope.queryParam.type === 'city') {
						if (user.organization.country === 'USA') {
							scope.mapScope = 'usa';
						}
					}

					scope.mapObject = {
						scope: scope.mapScope,
						options: {
							width: 1110,
							legendHeight: 60 // optionally set the padding for the legend
						},
						geographyConfig: {
							highlighBorderColor: '#EAA9A8',
							highlighBorderWidth: 2,
							popupTemplate: function(geo, data) {
								var CTR = data.imps ? $filter('percentage')(data.clicks / data.imps, 2): '0';
								return ['<div class="hoverinfo">',
										_.capitalize(scope.queryParam.type) + ': ' + geo.properties.name + '<br>',
										'<strong>Impressions: ' + data.imps + '</strong><br>',
										'<strong>CTR: ' + CTR + '</strong>',
										'</div>'].join('');
							}
						},
						fills: {
							'EXTREME': '#CC4731',
							'HIGH': '#9764BC',
							'MEDIUM': '#306596',
							'LOW': '#667FAF',
							'LESSER': '#A5DEA5',
							'defaultFill': '#DDDDDD'
						}
					};

					// update map data
					scope.mapObject.data = mapData;
				});
			}
		};
	}
]);
