/**
 * Created by Chuoxian Yang on 24/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGeo', [
	'Analytics',
	'Notify',
	'$rootScope',
	function(
		Analytics,
		Notify,
		$rootScope
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {
				defaultQueryParam: '=',
				queryType: '='
			},
			templateUrl: 'modules/analytics/views/partials/query-geo.html',
			link: function(scope, element, attrs) {
				scope.queryParam = scope.defaultQueryParam;
				scope.user = user;
				scope.queryFunction = Analytics.queryFunction(scope.queryParam.type, $rootScope.role);
				// Listen to broadcast to launchQuery
				scope.$on('launchQuery', function(event, args) {
					scope.queryParam = args.queryParam;
					scope.queryFunction = Analytics.queryFunction(scope.queryParam.type);
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
						highlighBorderWidth: 2
					},
					fills: {
						'HIGH': '#CC4731',
						'MEDIUM': '#306596',
						'LOW': '#667FAF',
						'defaultFill': '#DDDDDD'
					},
					/*
					data: {
						"AZ": {
							"fillKey": "MEDIUM",
						},
						"CO": {
							"fillKey": "HIGH",
						},
						"DE": {
							"fillKey": "LOW",
						},
						"GA": {
							"fillKey": "MEDIUM",
						}
					},
					*/
				};
				scope.getGeoData = function(queryParam) {
					scope.isLoading = true;
					scope.humanizedDateRange = queryParam.humanizedDateRange;
					/// query aggregations endPoint
					scope.queryFunction(queryParam)
					.then(function(response) {
						scope.isLoading = false;
						scope.geoQueryResults = response.data;
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

				// Initial query when loading
				scope.getGeoData(scope.queryParam);
			}
		};
	}
]);
