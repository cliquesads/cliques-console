/**
 * Created by Chuoxian Yang on 24/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGeo', [
	'$rootScope',
	function(
		$rootScope
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {
			},
			templateUrl: 'modules/analytics/views/partials/query-geo.html',
			link: function(scope, element, attrs) {
				if (!scope.mapObject) {
					scope.mapObject = {
						scope: 'usa',
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
				}
				scope.$on('countrySelected', function(event, args) {
					var selectedCountry = args.country.toLowerCase();
					console.log('selected country: ' + selectedCountry);
					scope.mapObject.scope = selectedCountry;
				});
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
