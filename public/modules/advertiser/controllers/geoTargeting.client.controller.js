/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('GeoTargetingController', [
	'$scope', '$state', 'Notify', 'campaign', 'ngDialog', '$window', '$rootScope', 'Country', 'Region', 'City', 'DndTreeWrapper',
	function($scope, $state, Notify, campaign, ngDialog, $window, $rootScope, Country, Region, City, DndTreeWrapper) {

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

		//====================================================//
		//================ BEGIN Map Settings ================//
		//====================================================//
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
				selectedGeo.countryName = selectedGeo.name;
				selectedGeo.countryId = selectedGeo.id;
			} else {
				selectedGeo.type = 'region';
				selectedGeo.countryName = $scope.selectedGeo.countryName;
				selectedGeo.countryId = $scope.selectedGeo.countryId;
			}

			$rootScope.selectedGeo = selectedGeo;
			$state.reload();
		};

		$scope.reloadWorldMap = function() {
			delete $rootScope.selectedGeo;
			$state.reload();
		};
		//====================================================//
		//================ END of Map Settings ================//
		//====================================================//

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
					var newGeoNode = initializeGeoNode($scope.selectedGeo.name, 'Country', response._id);
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
					var newBlockNode = initializeGeoNode($scope.selectedGeo.name, 'Country', response._id);
					$scope.blockedGeos.push(newBlockNode);
				});
			} else {
				var regionId = $scope.selectedGeo.countryId + '-' + $scope.selectedGeo.id;
				Region.readOne({regionId: regionId}).$promise
				.then(function(response) {
					var newBlockNode = initializeGeoNode($scope.selectedGeo.name, 'Region', response._id);
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
			// Convert geoTargets to DB format and send to backend
			var geoTargetsSchema = [];
			$scope.geoTargets.forEach(function(geoTarget) {
				geoTargetsSchema.push({
					weight: geoTarget.weight,
					target: geoTarget.target
				});
			});
			var blockedGeosSchema = [];
			$scope.blockedGeos.forEach(function(blockedGeo) {
				blockedGeosSchema.push({
					weight: blockedGeo.weight,
					target: blockedGeo.target
				});
			});
			$scope.campaign.geo_targets = geoTargetsSchema;
			$scope.campaign.blocked_geo = blockedGeosSchema;
			$scope.advertiser.$update(function() {
				$scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
				$scope.dirty = false;
				Notify.alert('Thanks! Your settings have been saved.', {});
			}, function(errorResponse) {
				$scope.dirty = false;
				Notify.alert('Error saving settings: ' + errorResponse.message, {status: 'danger'});
			});
		};

		// Undo all unsaved changes
		$scope.reset = function() {
			// TO-DO:::ycx
		};

		//====================================================//
		//================ END of Map Settings ===============//
		//====================================================//

		/**
		 * Adds custom methods & properties to tree node object.
		 *
		 * Wrapping in custom prototype won't work because site-tree-dnd relies
		 * on certain ownProperties of node objects, so pushing these up the
		 * prototype chain breaks it.  So this is sort of a hack to add methods
		 * & properties directly to clones of raw node instances.
		 *
		 * @param node
		 * @param nodeType
		 * @param parentId
		 * @returns {node}
		 */
		var _initializeGeoTreeNode = function(node, nodeType, parentId) {
			// Create node clone
			var newNode = _.clone(node);

			// Add custom node properties
			newNode.parentId = parentId; // Needed for conversion to Geo Treen DND format
			newNode.nodeType = nodeType;
			newNode.__hideSlider__ = false;
			// Set initial state as overridden so that it only can be set false
			// when slider is engaged by user
			newNode.__overridden__ = true;
			newNode.__lock__ = false;
			newNode.weight = node.weight || 1.0;

			// Properties used by blocked_geo settings
			newNode.explicit = false;

			// Clear old children properties, since children will be repopulated
			// under unified param __children__ when converted into Geo Tree DND format
			if (nodeType === 'Country') {
				delete newNode.regions;
			} else if (nodeType === 'Region') {
				delete newNode.cities;
			}

			// ========= BEGIN Node Instance Methods ======== //
			newNode.overrideChildWeights = function() {
				var self = this;
				self.__children__.forEach(function(node) {
					node.weight = self.weight;
					node.__overridden__ = true;
					if (self.nodeType === 'Country') {
						node.overrideChildWeights();
					}
				});
			};
			return newNode;
		};

		//====================================================//
		//=============== BEGIN GeoTree Class ===============//
		//====================================================//

		/**
		 * Subclass of DndTreeWrapper with GeoTree specific methods
		 *
		 * @param treeData shared tree data model with tree-dnd directive.
		 * @param control tree-dnd control object. Will default to base methods when bound to directive, but
		 *		can pass in an object containing custom control methods.
		 * @param expanding_property tree-dnd `expanding property` model
		 * @param columns tree-dnd column model
		 * @constructor
		 */
		var GeoTree = function(treeData, control, expanding_property, columns) {
			DndTreeWrapper.call(this, treeData, control, expanding_property, columns);	
		};
		GeoTree.prototype = Object.create(DndTreeWrapper.prototype);		

		/**
		 * Show all sub-geo within the selected geo node,
		 * if selected geo node is a country, show all its regions/states
		 * if selected geo node is a region, show all its cities
		 *
		 * @param node
		 * @param callback
		 */
		GeoTree.prototype.expandGeoNode = function(node, callback) {
			var flattened = this.traverseTree();
			if (node.nodeType === 'Country') {
				// Load regions/states for selected country dynamically from DB
				Region.query({country: node._id}).$promise
				.then(function(regions) {
					regions.forEach(function(region) {
						var newRegionNode = _initializeGeoTreeNode(region, 'Region', node._id);
						flattened.push(newRegionNode);
					});
				});
			} else if (node.nodeType === 'Region') {
				// Load cities for selected region dynamicaly from DB
				City.query({region: node._id}).$promise
				.then(function(cities) {
					cities.forEach(function(city) {
						var newCityNode = _initializeGeoTreeNode(city, 'City', node._id);
						flattened.push(newCityNode);
					});
				});
			}
			this.data = $TreeDnDConvert.line2tree(flattened, '_id', 'parentId');
			callback(null, this.data);
		};

		/**
		 * Show all sub-geo within the clicked geo node,
		 * if clicked geo node is country, show all its regions,
		 * if clicked geo node is region, show all its cities
		 */
		$scope.expandGeoNode = function(node) {
			if (node.nodeType === 'Country') {
				Region.query({country: node.target}).$promise.
				then(function(response) {
					$scope.countryNode = node;
					if (response.length >= 1) {
						$scope.geoTargets = [];
						response.forEach(function(region) {
							var newRegionNode = initializeGeoNode(region.name, 'Region', region._id);
							$scope.geoTargets.push(newRegionNode);
						});
					}
				});
			} else if (node.nodeType === 'Region') {
				City.query({region: node.target}).$promise.
				then(function(response) {
					$scope.regionNode = node;
					if (response.length > 1) {
						$scope.geoTargets = [];
						response.forEach(function(city) {
							var newCityNode = initializeGeoNode(city.name, 'City', city._id);
							$scope.geoTargets.push(newCityNode);
						});
					}
				});
			}
		};
	}
]);