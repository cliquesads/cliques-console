/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('GeoTargetingController', [
	'$scope', '$state', 'Notify', 'campaign', 'ngDialog', '$window', '$rootScope', 'Country', 'Region',
	function($scope, $state, Notify, campaign, ngDialog, $window, $rootScope, Country, Region) {

		$scope.Math = Math;
		$scope.dirty = false;

		/**
		 * Get Campaign from URL state params on load
		 */
		$scope.advertiser = campaign.advertiser;
		$scope.campaignIndex = campaign.index;
		$scope.campaign = campaign.campaign;

		// TO-DO:::ycx these 2 arrays should be initialized by the value in database
		$scope.geoTargets = [];
		$scope.blockedGeos = [];

		var mapScope = 'world';
		$scope.mapAvailable = true;
		if ($rootScope.selectedGeo) {
			$scope.selectedGeo = $rootScope.selectedGeo;
			$scope.showingActionOptions = true;
			mapScope = 'usa';
			if ($scope.selectedGeo.type === 'country' && $scope.selectedGeo.id !== 'USA') {
				mapScope = 'custom';
				$scope.mapAvailable = false;
			}
		}

		var mapFillColors = {
			EXTREME: '#CC4731',
			HIGH: '#9764BC',
			MEDIUM: '#306596',
			LOW: '#667FAF',
			LESSER: '#A5DEA5',
			defaultFill: '#DDDDDD'
		};
		var popupTemplate = function(geo, data) {
			return [
				'<div class="hoverinfo">',
				geo.properties.name + '<br>',
				'</div>'
			].join('');
		};

		// prepare for mapObject
		$scope.mapObject = {
			scope: mapScope,
			options: {
				// current window inner width minus the width of the sidebar
				width: $window.innerWidth - 294,
				legendHeight: 60 	// optionally set the padding of the legend
			},
			geographyConfig: {
				popupTemplate: popupTemplate	
			},
			fills: mapFillColors
		};

		$scope.mapClicked = function(geography) {
			// Map clicked, should zoom into the clicked area, also show option to customize bidding or block the area
			// Datamap doesn't allow dynamically changing map scope, so need to reload state with selected country/region as stateParam
			var selectedGeo = {
				id: geography.id,
				name: geography.properties.name
			};
			if ($scope.mapObject.scope === 'world') {
				selectedGeo.type = 'country';
			} else {
				selectedGeo.type = 'region';
				selectedGeo.countryName = $rootScope.selectedGeo.name;
				selectedGeo.countryId = $rootScope.selectedGeo.id;
			}

			$rootScope.selectedGeo = selectedGeo;
			$state.reload();
		};

		$scope.reloadWorldMap = function() {
			delete $rootScope.selectedGeo;
			$state.reload();
		};

		$scope.getAllGeosHelp = function() {
			ngDialog.open({
				className: 'ngdialog-theme-default',
				template: 'modules/advertiser/views/partials/all-geos-help-text.html',
				controller: ['$scope', function($scope) {
					$scope.campaign = $scope.ngDialogData.campaign;
				}],
				data: {campaign: $scope.campaign}
			});
		};

		var initializeGeoNode = function(nodeName, nodeType, nodeId) {
			return {
				nodeName: nodeName,
				nodeType: nodeType,
				target: nodeId,
				weight: 1.0
			};
		};

		$scope.customizeBiddingForGeo = function() {
			$scope.showingActionOptions = false;
			$scope.dirty = true;
			if ($scope.selectedGeo.type === 'country') {
				Country.readOne({countryId: $scope.selectedGeo.id}).$promise
				.then(function(response) {
					var newGeoNode = initializeGeoNode($scope.selectedGeo.name, 'Geo', response._id);
					$scope.geoTargets.push(newGeoNode);
				});
			} else {
				var regionId = $scope.selectedGeo.countryId + '-' + $scope.selectedGeo.id;
				Region.readOne({regionId: regionId}).$promise
				.then(function(response) {
					var newGeoNode = initializeGeoNode($scope.selectedGeo.name, 'Region', response._id);
					$scope.geoTargets.push(newGeoNode);
				});
			}
		};

		$scope.blockGeo = function() {
			$scope.showingActionOptions = false;
			$scope.dirty = true;
			if ($scope.selectedGeo.type === 'country') {
				Country.readOne({countryId: $scope.selectedGeo.id}).$promise
				.then(function(response) {
					var newBlockNode = initializeGeoNode($scope.selectedGeo.name, 'Geo', response._id);
					$scope.blockedGeos.push(newBlockNode);
				});
			} else {
				var regionId = $scope.selectedGeo.countryId + '-' + $scope.selectedGeo.id;
				Region.readOne({regionId: regionId}).$promise
				.then(function(response) {
					var newBlockNode = initializeGeoNode($scope.selectedGeo.name, 'Geo', response._id);
					$scope.blockedGeos.push(newBlockNode);
				});
			}
		};

		$scope.removeGeoTarget = function(node) {
			var nodeIndex = $scope.geoTargets.indexOf(node);
			$scope.geoTargets.splice(nodeIndex, 1);
		};

		$scope.removeBlockedGeo = function(node) {
			var nodeIndex = $scope.blockedGeos.indexOf(node);
			$scope.blockedGeos.splice(nodeIndex, 1);
		};

		/**
		 * Save handler. Converts geo_targets to geoTargetSchema DB format,
		 * and converts blocked_geos to DB format, updates advertiser.
		 */
		$scope.save = function() {
			// TO-DO:::ycx	
		};

		// Undo all unsaved changes
		$scope.reset = function() {
			// TO-DO:::ycx
		};
	}
]);