/**
 * Created by Chuoxian Yang on 24/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGeo', [
	'Analytics',
	'Notify',
	'$rootScope',
	'$filter',
	function(
		Analytics,
		Notify,
		$rootScope,
		$filter
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {
				queryType: '='
			},
			templateUrl: 'modules/analytics/views/partials/query-geo.html',
			link: function(scope, element, attrs) {
				scope.user = user;
				// Listen to broadcast to launchQuery
				scope.$on('launchQuery', function(event, args) {
					scope.queryParam = args.queryParam;
					scope.queryFunction = Analytics.queryFunction(scope.queryParam.type, $rootScope.role);
					scope.getGeoData(scope.queryParam);
				});

				var mapScope;
				if (scope.queryType === 'country') {
					mapScope = 'world';
				} else if (scope.queryType === 'state' || scope.queryType === 'city') {
					if (user.organization.country === 'USA') {
						mapScope = 'usa';
					}
				}

				scope.mapObject = {
					scope: mapScope,
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
									'Country: ' + geo.properties.name + '<br>',
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
				scope.getGeoData = function(queryParam) {
					scope.isLoading = true;
					scope.humanizedDateRange = queryParam.humanizedDateRange;
					/// query aggregations endPoint
					scope.queryFunction(queryParam)
					.then(function(response) {
						scope.isLoading = false;
						scope.geoQueryResults = response.data;

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
								var countryMapColor;
								if (row.imps < (highestImpressions / 5)) {
									countryMapColor = 'LESSER';	
								} else if (row.imps < 2 * (highestImpressions / 5)) {
									countryMapColor = 'LOW';	
								} else if (row.imps < 3 * (highestImpressions / 5)) {
									countryMapColor = 'MEDIUM';
								} else if (row.imps < 4 * (highestImpressions / 5)) {
									countryMapColor = 'HIGH';
								} else {
									countryMapColor = 'EXTREME';
								}
								mapData[row._id.country._id] = {
									fillKey: countryMapColor,
									imps: row.imps,
									clicks: row.clicks
								};
							}
						});
						// update map data
						scope.mapObject.data = mapData;
					})
					.catch(function(error) {
						scope.isLoading = false;
						Notify.alert('Error on query for geo data.');
					});
				};
				scope.stateClicked = function(geography) {
					scope.selectedState = {
						name: geography.properties.name,
						code: geography.id
					};
				};
			}
		};
	}
]);
