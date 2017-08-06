/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('GeoTargetingController', [
	'$scope', '$state', 'Notify', 'campaign', 'ngDialog', '$window', '$rootScope', 'Country', 'Region', 'City', 'DndTreeWrapper', '$TreeDnDConvert', 'OPENRTB', 'aggregationDateRanges', 'GeoAdStat', '$timeout', 'CampaignGeo', '$location', '$anchorScroll',
	function($scope, $state, Notify, campaign, ngDialog, $window, $rootScope, Country, Region, City, DndTreeWrapper, $TreeDnDConvert, OPENRTB, aggregationDateRanges, GeoAdStat, $timeout, CampaignGeo, $location, $anchorScroll) {

		$scope.Math = Math;
		$scope.dirty = false;
		$scope.layout = 'horizontal';

		$scope.switchLayout = function() {
			// Change page layout 
			if ($scope.layout === 'horizontal') {
				$scope.layout = 'vertical';
				$scope.mapObject.options.width = $window.innerWidth - 294;
			} else {
				$scope.layout = 'horizontal';
				$scope.mapObject.options.width = ($window.innerWidth - 320) * 7 / 12;
			}
		};

		$scope.showActionsDialog = function() {
			var parentScope = $scope;
			// Show the dialog to customize or block bidding for a targetted area
			ngDialog.open({
				template: 'modules/advertiser/views/partials/geo-target-actions-dialog.html',
				data: {
					selectedGeo: $scope.selectedGeo
				},
				controller: ['$scope', '$rootScope', function($scope, $rootScope) {
					$scope.selectedGeo = $scope.ngDialogData.selectedGeo;
					$scope.customizeBiddingForGeo = function() {
						parentScope.dirty = true;
						var countryNode;
						if (parentScope.selectedGeo.type === 'country') {
							// A country is selected to customize,
							// load the whole country and all its regions/cities
							parentScope.loadingTargetTree = true;
							countryNode = parentScope.geo_targets.addCountryNode(parentScope.selectedGeo);
							parentScope.geo_targets.loadCountryGeoChildren(countryNode)
							.then(function() {
								// get cpms for each loaded geo
								return parentScope.getGeoTreeStats(parentScope.geo_targets.data, parentScope.defaultDateRange);
							})
							.then(function() {
								parentScope.loadingTargetTree = false;
							});
						} else {
							// A region is selected to customize,
							// should load just that region and its cities
							parentScope.loadingTargetTree = true;
							countryNode = parentScope.geo_targets.addCountryNode($rootScope.selectedCountry);
							var regionNode = parentScope.geo_targets.addRegionNode($scope.selectedGeo, countryNode);
							regionNode.__expanded__ = false;
							parentScope.geo_targets.loadRegionGeoChildren(regionNode)
							.then(function() {
								// get cpms for each loaded geo
								return parentScope.getGeoTreeStats(parentScope.geo_targets.data, parentScope.defaultDateRange);
							})
							.then(function() {
								parentScope.loadingTargetTree = false;
							});
						}
						$scope.closeThisDialog('success');
					};

					$scope.blockGeo = function() {
						parentScope.dirty = true;
						var countryNode;
						if (parentScope.selectedGeo.type === 'country') {
							// A country is selected to block,
							// load the whole country and all its regions/cities
							parentScope.loadingBlockTree = true;
							countryNode = parentScope.blocked_geos.addCountryNode(parentScope.selectedGeo);
							parentScope.blocked_geos.loadCountryGeoChildren(countryNode)
							.then(function() {
								parentScope.loadingBlockTree = false;
							});
						} else {
							// A region is selected to customize,
							// should load just that region and its cities
							parentScope.loadingBlockTree = true;
							countryNode = parentScope.blocked_geos.addCountryNode($rootScope.selectedCountry);
							var regionNode = parentScope.blocked_geos.addRegionNode($scope.selectedGeo, countryNode);
							regionNode.__expanded__ = false;
							parentScope.blocked_geos.loadRegionGeoChildren(regionNode)
							.then(function() {
								parentScope.loadingBlockTree = false;
							});
						}
						$scope.closeThisDialog('success');
					};
				}]
			});
		};

		/**
		 * Get Campaign from URL state params on load
		 */
		$scope.advertiser = campaign.advertiser;
		$scope.campaignIndex = campaign.index;
		$scope.campaign = campaign.campaign;

		//====================================================//
		//================ BEGIN Map Settings ================//
		//====================================================//
		var mapScope = 'world';
		$scope.mapAvailable = true;
		if ($rootScope.selectedCountry) {
			$scope.selectedGeo = $rootScope.selectedCountry;
			$scope.selectedCountry = $rootScope.selectedCountry;
			mapScope = 'usa';
			if ($rootScope.selectedCountry._id !== 'USA') {
				mapScope = 'custom';
				$scope.showActionsDialog();
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
				width: ($window.innerWidth - 320) * 7 / 12,
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
			var selectedGeo;
			if ($scope.mapObject.scope === 'world') {
				Country.readOne({countryId: geography.id}).$promise
				.then(function(country) {
					selectedGeo = angular.copy(country);
					selectedGeo.type = 'country';
					$rootScope.selectedCountry = selectedGeo;
					$scope.selectedGeo = selectedGeo;
					$state.reload();
				});
			} else {
				var regionId = $rootScope.selectedCountry._id + '-' + geography.id;
				Region.readOne({regionId: regionId}).$promise
				.then(function(region) {
					selectedGeo = angular.copy(region);
					selectedGeo.type = 'region';	
					$scope.selectedGeo = selectedGeo;
					$scope.showActionsDialog();
				});
			}
		};

		$scope.reloadWorldMap = function() {
			delete $rootScope.selectedCountry;
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

		/**
		 * Save handler. Converts geo_targets to geoTargetSchema DB format,
		 * and converts blocked_geos to DB format, updates advertiser.
		 */
		$scope.save = function() {
			// clear search result and search status
			$scope.geo_targets.clearSearchResult();
			$scope.searchingStatus.geo_targets = false;
			$scope.blocked_geos.clearSearchResult();
			$scope.searchingStatus.blocked_geos = false;

			$scope.geo_targets.toGeoTargetsSchema(function(err, targetsArray) {
				$scope.campaign.geo_targets = targetsArray;
				$scope.blocked_geos.toBlockedGeosSchema(function(err, blockedArray) {
					$scope.campaign.blocked_geos = blockedArray;
					$scope.advertiser.$update(function() {
						$scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
						$scope.dirty = false;
						Notify.alert('Thanks! Your settings have been saved.');
					}, function(errorResponse) {
						$scope.dirty = false;
						Notify.alert('Error saving settings: ' + errorResponse.message, {
							status: 'danger'
						});
					});
				});
			});
		};

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
		var _initializeGeoTreeNode = function(node, nodeType, parentId, treeType, parentNodeWeight) {
			// Create node clone
			var newNode = _.clone(node);

			// Add custom node properties
			newNode.parentId = parentId; // Needed for conversion to Geo Treen DND format
			newNode.nodeType = nodeType;
			// Hide slider for city node for performance tuning
			if (nodeType !== 'City') {
				newNode.__hideSlider__ = false;
			} else {
				newNode.__hideSlider__ = true;
			}
			// Set initial state as overridden so that it only can be set false
			// when slider is engaged by user
			newNode.__overridden__ = true;
			if (nodeType === 'Country') {
				if (node.weight !== 1.0) {
					newNode.__overridden__ = false;
				}
			} else {
				if (node.weight !== parentNodeWeight) {
					newNode.__overridden__ = false;
				}
			}
			newNode.__lock__ = false;
			if (node.weight === 0) {
				newNode.weight = 0;
			} else {
				newNode.weight = node.weight || 1.0;
			}
			// search result flag to show the node background with a different color
			newNode.__isAncestorOfSearchResult__ = false;
			newNode.__isSearchResult__ = false;
			newNode.__treeType__ = treeType;

			// Properties used by blocked_geos settings
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
				if (self.__children__) {
					if (self.nodeType === 'Country') {
						self.__children__.forEach(function(node) {
							node.weight = self.weight;
							node.__overridden__ = true;
							node.overrideChildWeights();
						});
					} else if (self.nodeType === 'Region') {
						self.__children__.forEach(function(node) {
							node.__overridden__ = true;
							node.weight = self.weight;
						});
					}
				}
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
		var GeoTree = function(treeData, control, expanding_property, columns, treeType) {
			this.treeType = treeType;
			DndTreeWrapper.call(this, treeData, control, expanding_property, columns);	
		};
		GeoTree.prototype = Object.create(DndTreeWrapper.prototype);		

		GeoTree.prototype.addCountryNode = function(countryObj) {
			// Need to make sure the country node is NOT YET in geotree
			for (var i = 0; i < this.data.length; i ++) {
				if (this.data[i]._id === countryObj._id) {
					return this.data[i];
				}
			}
			var countryNode = _initializeGeoTreeNode(countryObj, 'Country', null, this.treeType);
			this.data.push(countryNode);
			return countryNode;
		};

		GeoTree.prototype.addRegionNode = function(regionObj, countryNode) {
			var i = 0;
			if (countryNode.__children__) {
				for (i = 0; i < countryNode.__children__.length; i ++) {
					if (countryNode.__children__[i]._id === regionObj._id) {
						// Such region node already exists in tree data, return this existed region node
						return countryNode.__children__[i];
					}	
				}
			}
			regionObj.weight = countryNode.weight;
			var regionNode = _initializeGeoTreeNode(regionObj, 'Region', regionObj.country, this.treeType, countryNode.weight);
			if (!countryNode.__children__) {
				countryNode.__children__ = [];
			}
			countryNode.__children__.push(regionNode);
			return regionNode;
		};

		GeoTree.prototype.addCityNode = function(cityObj, regionNode) {
			// Make sure the city about to add is NOT YET in this region
			var i = 0;
			if (regionNode.__children__) {
				for (i = 0; i < regionNode.__children__.length; i ++) {
					if (regionNode.__children__[i]._id === cityObj._id) {
						// Such city node already exists in tree data, return this existed city node
						return regionNode.__children__[i];
					}
				}
			}
			cityObj.weight = regionNode.weight;
			var cityNode = _initializeGeoTreeNode(cityObj, 'City', regionNode._id, this.treeType, regionNode.weight);
			if (!regionNode.__children__) {
				regionNode.__children__ = [];
			}
			regionNode.__children__.push(cityNode);
			return cityNode;
		};

		GeoTree.prototype.loadRegionGeoChildren = function(regionNode) {
			var self = this;
			return CampaignGeo.getRegionCities(regionNode._id)
			.then(function(response) {
				var cities = response.data;
				var sortedCities = _.orderBy(cities, 'name', 'asc');
				sortedCities.forEach(function(city) {
					self.addCityNode(city, regionNode);
				});
			});
		};

		GeoTree.prototype.loadCountryGeoChildren = function(countryNode) {
			var self = this;
			// Get all regions for this country and load them in tree
			return CampaignGeo.getGeoChildren(countryNode)
			.then(function(response) {
				var cities = response.data;
				// Group cities by region id
				var groupedCities = _.groupBy(cities, 'region._id');
				for (var regionId in groupedCities) {
					// For data inconsistencies, some cities don't belong to 
					// any region, get rid of those cities
					if (groupedCities.hasOwnProperty(regionId) && regionId !== 'undefined') {
						var regionNode = self.addRegionNode(groupedCities[regionId][0].region, countryNode);
						// Sort cities alphabetically by their name
						var sortedCities = _.orderBy(groupedCities[regionId], 'name', 'asc');
						for (var i = 0; i < sortedCities.length; i ++) {
							var clonedCity = _.clone(sortedCities[i]);
							clonedCity.region = clonedCity.region._id;
							self.addCityNode(clonedCity, regionNode);
						}
						// default collapse region node
						regionNode.__expanded__ = false;
					}
				}
			});
		};

		GeoTree.prototype.searchNode = function(nodeName) {
			nodeName = _.toLower(nodeName);
			for (var i = 0; i < this.data.length; i ++) {
				// Search for country
				if (_.toLower(this.data[i].name) === nodeName) {
					this.data[i].__isSearchResult__ = true;
					this.data[i].__expanded__ = false;
					return this.data[i];
				} else if (this.data[i].__children__) {
					for (var j = 0; j < this.data[i].__children__.length; j ++) {
						// Search for region
						if (_.toLower(this.data[i].__children__[j].name) === nodeName) {
							this.data[i].__children__[j].__isSearchResult__ = true;	
							// Found region, should expand its parent country
							this.data[i].__isAncestorOfSearchResult__ = true;
							this.data[i].__expanded__ = true;
							this.data[i].__children__[j].__expanded__ = false;
							return this.data[i].__children__[j];
						} else if (this.data[i].__children__[j].__children__) {
							for (var k = 0; k < this.data[i].__children__[j].__children__.length; k ++) {
								// Search for city
								if (_.toLower(this.data[i].__children__[j].__children__[k].name) === nodeName) {
									this.data[i].__children__[j].__children__[k].__isSearchResult__ = true;	
									// Found city with name that matches the search keyword, should expand its parent country and parent region
									this.data[i].__expanded__ = true;
									this.data[i].__isAncestorOfSearchResult__ = true;
									this.data[i].__children__[j].__expanded__ = true;
									this.data[i].__children__[j].__isAncestorOfSearchResult__ = true;
									return this.data[i].__children__[j].__children__[k];
								}
							}
						}
					}
				}
			}
			// Search not found
			return null;
		};

		GeoTree.prototype.clearSearchResult = function() {
			for (var i = 0; i < this.data.length; i ++) {
				if (this.data[i].__isSearchResult__ === true) {
					this.data[i].__isSearchResult__ = false;
					return;
				} else if (this.data[i].__children__) {
					for (var j = 0; j < this.data[i].__children__.length; j ++) {
						if (this.data[i].__children__[j].__isSearchResult__ === true) {
							this.data[i].__children__[j].__isSearchResult__ = false;	
							this.data[i].__isAncestorOfSearchResult__ = false;
							return;
						} else if (this.data[i].__children__[j].__children__) {
							for (var k = 0; k < this.data[i].__children__[j].__children__.length; k ++) {
								if (this.data[i].__children__[j].__children__[k].__isSearchResult__ === true) {
									this.data[i].__children__[j].__children__[k].__isSearchResult__ = false;	
									this.data[i].__children__[j].__isAncestorOfSearchResult__ = false;
									this.data[i].__isAncestorOfSearchResult__ = false;
									return;
								}
							}
						}
					}
				}
			}
		};


		/**
		 * Loads this.data for geo_targets or blocked_geos
		 *
		 * Basically flattens returned data, then passes to $TreeDnDConvert function
		 * so it can be prepared for tree
		 * @param geos can be geo_targets or blocked_geos from backend DB
		 * @param callback
		 */
		GeoTree.prototype.fromGeosInCampaign = function(advertiserId, campaignId, targetOrBlock) {
			var self = this;
			return CampaignGeo.getGeoTrees(advertiserId, campaignId, targetOrBlock) 
			.then(function(response) {
				var geoData = response.data;
				var flattened = [];
				if (!geoData) return;
				geoData.forEach(function(country) {
					var countryNode = _initializeGeoTreeNode(country, 'Country', null, self.treeType);
					flattened.push(countryNode);
					if (country.regions) {
						country.regions.forEach(function(region) {
							var regionNode = _initializeGeoTreeNode(region, 'Region', country._id, self.treeType, countryNode.weight);
							flattened.push(regionNode);
							if (region.cities) {
								region.cities.forEach(function(city) {
									var cityNode = _initializeGeoTreeNode(city, 'City', region._id, self.treeType, regionNode.weight);
									flattened.push(cityNode);
								});
							}
						});	
					}
				});
				self.data = $TreeDnDConvert.line2tree(flattened, '_id', 'parentId');
			});
		};

		/**
		 * Applies all applicable weight overrides from parents to children,
		 * depending on if parent weights have changes from prior state. Meant to
		 * only be used in $scope.$watch hook, where oldGeoTree is the older verion
		 * of the GeoTree instance which has been modified.
		 *
		 * @param oldGeoTree old GeoTree instance in $scope
		 */
		GeoTree.prototype.applyParentOverrides = function(oldGeoTree) {
			var self = this;
			function inner(newGeoTree, oldGeoTree) {
				if (newGeoTree) {
					for (var i = 0; i < newGeoTree.length; i ++) {
						var newNode = newGeoTree[i];
						var oldNode;
						if (!oldGeoTree || oldGeoTree.length === 0) {
							oldNode = {};
						} else {
							oldNode = oldGeoTree[i];
						}
						if (newNode && oldNode) {
							if (newNode.weight !== oldNode.weight) {
								newNode.overrideChildWeights();
							}
							inner(newNode.__children__, oldNode.__children__);
						}
					}
				}
			}
			return inner(self.data, oldGeoTree.data);
		};

		/**
		 * Sets __hideSlider__ property on this tree, given a masterTree
		 * to perform diff on.
		 *
		 * ONLY USE IF YOU PLAN TO ALWAYS REMOVE NON-BASE LEVEL LEAF NODES FROM
		 * MASTER TREE (I.E. NODES WITHOUT ANY CHILDREN)
		 *
		 * __hideSlider__ property is meant to indicate that the "weighting"
		 * slider UI element should be hidden, which will prevent users from
		 * settings a weight for this node.
		 *
		 * The logic encapsulated in this method dictates that sliders be hidden
		 * for any nodes that exist in the provided "Master" GeoTree instance.
		 * The KEY ASSUMPTION here is that once a Master tree node on longer has
		 * any children, it is removed from the master tree.
		 *
		 * The `GeoTree.reGeoTree.prototype.moveNodeAndEmptyAncestors` method 
		 * does exactly this, so as long as you use this method to clean up the
		 * master tree when nodes are added to this tree, you're fine.
		 *
		 * @param masterTree master GeoTree instance w/ record of all nodes
		 */
		GeoTree.prototype.setSliderHiders = function(masterTree) {
			// If you need to unhide a node slider, you also need to unhide
			// all child node sliders, so this is just a quick method to hide
			// node & all child sliders recursively
			function unhideSliders(node) {
				node.__hideSlider__ = false;
				if (node.__children__ && node.__children__.length > 0) {
					node.__children__.forEach(function(child) {
						unhideSliders(child);
					});
				}
			}

			function inner(masterTree, slaveTree) {
				slaveTree.forEach(function(node) {
					var existingNode = _.find(masterTree, function(n) {
						return n._id === node._id;
					});
					// If node exists in amster tree, seet hideSlider to true
					// so user can't set weight on a node whose children are
					// not all present
					if (existingNode) {
						node.__hideSlider__ = true;
						if (node.__children__.length > 0) {
							inner(existingNode.__children__, node.__children__);
						}
					} else {
						unhideSliders(node);
					}
				});
			}
			return inner(masterTree.data, this.data);
		};

		/**
		 * Helper function to prune any unnecessary children from client-side tree data
		 * before persisting to DB. This is useful because of the "sparse tree" format
		 * that targeting trees are stored in.
		 *
		 * Can't just ignore any overridden child since it may have grandchildren
		 * that aren't overridden, so have to do another sweep of the tree to prune
		 * any overridden branches
		 *
		 * @param targetsTree tree data
		 * @param overrideFunction function which returns boolean indicating whether to throw
		 * node out or not.
		 * `true` means node will be discarded if its unnecessary,
		 * `false` means keep it.
		 */
		function pruneOverriddenChildren(targetsTree, overrideFunction) {
			for (var a = 0; a < targetsTree.length; a ++) {
				var country = targetsTree[a];
				if (country.children) {
					for (var b = 0; b < country.children.length; b ++) {
						var region = country.children[b];
						if (region.children) {
							for (var c = 0; c < region.children.length; c ++) {
								var city = region.children[c];
								if (overrideFunction(city)) {
									region.children.splice(c, 1);
									c = c - 1;
								}
							}
							// Now work our way back up the tree to clean up
							// any nodes without any children left
							if (region.children.length === 0 && overrideFunction(region)) {
								country.children.splice(b, 1);
								b = b - 1;
							}
						} else {
							if (overrideFunction(region)) {
								country.children.splice(b, 1);
								b = b - 1;
							}
						}
					}
					if (country.children.length === 0 &&  overrideFunction(country)) {
						targetsTree.splice(a, 1);
						a = a - 1;
					}
				}
			}
			return targetsTree;
		}

		/**
		 * Converts treeData to Campaign.geo_targets schema format for saving.
		 *
		 * Recurses to lowest non-overridden level of each branch & saves branch, ignoring
		 * all overridden children.
		 *
		 * @return {*}
		 */
		GeoTree.prototype.toGeoTargetsSchema = function(callback) {
			var self = this;
			function inner(thisSubtree, targetsTree) {
				targetsTree = targetsTree || [];
				thisSubtree.forEach(function(node) {
					var weight = node.__overridden__ ? null : node.weight;
					var targetObj = {
						target: node._id,
						weight: weight,
						children: null,
						__overridden__: node.__overridden__
					};
					if (node.nodeType === 'City') {
						targetObj.name = node.name;
					}
					var children = self.control.get_children(node);
					targetsTree.push(targetObj);
					if (children.length > 0) {
						targetObj.children = [];
						inner(children, targetObj.children);
					}
				});
				return targetsTree;
			}
			var targetsTree = inner(this.data);
			targetsTree = pruneOverriddenChildren(targetsTree, function(obj) {
				return obj.__overridden__;
			});
			return callback(null, targetsTree);
		};

		/**
		 * Converts treeData to Campaign.blocked_geos schema format for saving.
		 *
		 * Recurses to lowest non-overridden level of each branch & saves branch, ignoring
		 * all overridden children.
		 *
		 * @return {*}	
		 */
		GeoTree.prototype.toBlockedGeosSchema = function(callback) {
			var self = this;
			function inner(thisSubtree, targetsTree) {
				targetsTree = targetsTree || [];	
				thisSubtree.forEach(function(node) {
					var targetObj = {
						target: node._id,
						children: null,
						explicit: node.explicit
					};
					if (node.nodeType === 'City') {
						targetObj.name = node.name;
					}
					var children = self.control.get_children(node);
					targetsTree.push(targetObj);
					if (children.length > 0) {
						targetObj.children = [];
						inner(children, targetObj.children);
					}
				});
				return targetsTree;
			}
			var blockedTree = inner(this.data);
			// iterate each blocked node in blockedTree, 
			// if the node is a leaf node,  i.e. a node with no children, 
			// then set node.explicit to true,
			// otherwise set node.explicit to false
			blockedTree.forEach(function(countryNode) {
				if (countryNode.children && countryNode.children.length > 0) {
					countryNode.explicit = false;
					countryNode.children.forEach(function(regionNode) {
						if (regionNode.children && regionNode.children.length > 0) {
							regionNode.explicit = false;
							regionNode.children.forEach(function(cityNode) {
								cityNode.explicit = true;
							});
						} else {
							regionNode.explicit = true;
						}
					});
				} else {
					countryNode.explicit = true;
				}
			});

			blockedTree = pruneOverriddenChildren(blockedTree, function(obj) {
				return obj.explicit === false;
			});
			return callback(null, blockedTree);
		};

		//====================================================//
		//================ END GeoTree Class =================//
		//====================================================//
		

		//==========================================================//
		//================ BEGIN GeoTree Instances =================//
		//==========================================================//
		var cpmColumnDef = {
			field: 				'stats.cpm',
			displayName: 		'Avg.CPM',
			titleTemplate: 		'<a href="#" tooltip="Average CPM on this Geo area for the {{ dateRanges[defaultDateRange].label }}">'  +
								'<i class="fa fa-line-chart"></i>&nbsp;Avg.<br/>CPM</a></div>',
			titleClass: 		'wd-xxs text-center',
			cellClass: 			'wd-xxs text-center',
			cellTemplate: 		'<div ng-show="node.stats.cpm">{{ node.stats.cpm | currency: "$" : 2 }}</div>' +
								'<small ng-hide="node.stats.cpm" class="text-muted"><i class="fa fa-heartbeat"> Not Enough Data</i></small>'

		};
		/**
		 * Event Handler to be bound to each slider `onStart` event.
		 * 
		 * Sets __overridden__ param for node being changed to true, and
		 * sets $scope.dirty to true as well.
		 *
		 * @param sliderId
		 * @return {*}
		 */
		$scope.onStart = function(sliderId) {
			function inner(tree) {
				tree.forEach(function(node) {
					if (node._id === sliderId) {
						node.__overridden__ = false;
					} else {
						if (node.__children__ && node.__children__.length > 0) {
							inner(node.__children__);
						}
					}
				});	
			}
			$scope.dirty = true;
			return inner($scope.geo_targets.data);
		};

		/**
		 * Geo Targets tree vars
		 */
		$scope.geo_targets = new GeoTree([], 
			{
				remove: function(node) {
					$scope.geo_targets.control.remove_node(node);
					$scope.dirty = true;
				}
			},
			{
				field: 'name',
				cellClass: 'v-middle wd-md',
				displayName: 'Name',
				logoSize: 'xs'	
			},
			[
				{
				    field: "weight",
				    titleClass:  'text-center',
				    displayName: "Weight",
				    cellTemplate: '<rzslider rz-slider-model="node.weight" rz-slider-options="{floor: 0,ceil: Math.round(campaign.max_bid/campaign.base_bid * 10) / 10,step: 0.0001,precision: 4,id: node._id, showSelectionBar: true, onStart: onStart, hideLimitLabels: true}" ng-hide="node.__hideSlider__"></rzslider>' +
				    // text hint for country and region nodes
				    '<div class="text-muted" ng-if="node.__hideSlider__ && !node.__expanded__ && node.nodeType !== \'City\'"><small><i class="fa fa-plus-circle"></i><em>&nbsp;&nbsp;Expand to view & set bids</em></small></div>' +
				    // button for city node to show/hide sliders
				    '<button ng-if="node.nodeType === \'City\'" type="button" class="btn btn-success btn-xs ml" ng-click="node.__hideSlider__ = !node.__hideSlider__"><i class="fa fa-sliders"></i>&nbsp;Click to Modify Bid</button>'
				},
				{
				    field: 'bid',
				    displayName: "Bid",
				    titleClass:   'wd-xxs text-center',
				    cellClass:    'wd-xxs text-center',
				    cellTemplate: '<span ng-hide="node.__hideSlider__" ng-class="{ \'text-green\': Math.min(node.weight * campaign.base_bid, campaign.max_bid) > node.stats.cpm, \'text-warning\': Math.min(node.weight * campaign.base_bid, campaign.max_bid) < node.stats.cpm, \'text-danger\': Math.min(node.weight * campaign.base_bid, campaign.max_bid) < node.stats.cpm / 2 }">' +
				    '<strong>{{ Math.min(node.weight * campaign.base_bid, campaign.max_bid) | currency : "$" : 2 }}</strong></span>'
				},
				cpmColumnDef,
				{
				    displayName:  'Actions',
				    titleClass:   'wd-xxs text-center',
				    cellClass:    'wd-xxs text-center',
				    cellTemplate: '<button type="button" class="btn btn-xs bg-gray-light" ng-click="geo_targets.control.remove(node)" tooltip="Clear Bids">' +
				    '<i class="fa fa-lg fa-remove"></i></button>'
				}
			],
			'geo_targets'
		);

		/**
		 * GeoTree for blocked geo tree vars
		 */
		$scope.blocked_geos = new GeoTree([],
			{
				remove: function(node) {
					$scope.blocked_geos.control.remove_node(node);
					$scope.dirty = true;
				}
			},
			{
			    field: "name",
			    cellClass: 'v-middle',
			    displayName: 'Name'
			},
			[{
			    displayName:  'Actions',
			    cellTemplate: '<button type="button" class="btn btn-xs bg-gray-light" ng-click="blocked_geos.control.remove(node)" tooltip="Unblock">' +
			    '<i class="fa fa-lg fa-remove"></i></button>'
			}],
			'blocked_geos'
		);

		//==========================================================//
		//================= END GeoTree Instances =================//
		//==========================================================//

		$scope.positions = function(posCode) {
			return _.find(OPENRTB.positions, function(pos_obj) {
				return pos_obj.code === posCode;
			});
		};

		/**
		 * This scope watch handles overriding of child entity weights when 
		 * parent is changed.
		 */
		$scope.$watch(function(scope) {
			return scope.geo_targets;
		}, function(newGeoTargets, oldGeoTargets) {
			if (newGeoTargets.data.length > 0 && oldGeoTargets.data.length > 0) {
				newGeoTargets.applyParentOverrides(oldGeoTargets);
			}
			$timeout(function() {
				$scope.$broadcast('rzSliderForceRender');
			});
		}, true);

		//======================================================================//
		//================= BEGIN Tree Initialization Handlers =================//
		//======================================================================//

		$scope.dateRanges = aggregationDateRanges(user.tz);
		$scope.defaultDateRange = '30d';
		
		/**
		 * Quick helper function to calculate CPMs for grouped geoadstat data
		 * @param groupedData
		 * @return {{}}
		 * @private
		 */
		function _getCpms(groupedData) {
			var cpms = {};
			for (var id in groupedData) {
				if (groupedData.hasOwnProperty(id)) {
					var imps = _.sumBy(groupedData[id], function(row) { return row.imps; });
					var spend = _.sumBy(groupedData[id], function(row) { return row.spend; });
					var cpm = spend / imps * 1000;
					cpms[id] = {
						imps: imps,
						spend: spend,
						cpm: cpm
					};
				}
			}	
			return cpms;
		}

		/**
		 * Gets impression, spend & CPM totals for given date range from GeoAdStat,
		 * groups by all Countries, Regions & Cities for efficient retrieval
		 *
		 * @param GeoTree
		 * @param dateRange
		 */
		$scope.getGeoTreeStats = function(geoTree, dateRange) {
			// exit if was passed empty geoTree
			if (!geoTree || geoTree.length === 0) return;	

			var startDate = $scope.dateRanges[dateRange].startDate;
			var endDate = $scope.dateRanges[dateRange].endDate;
			var geos = [];
			geoTree.forEach(function(geo) {
				geos.push(geo._id);
			});
			var geosQueryStr;
			if (geos.length === 1) {
				geosQueryStr = geos[0];
			} else {
				geosQueryStr = '{in}' + geos.join(',');
			}
			return GeoAdStat.pubSummaryQuery({
				groupBy: 'country,region,city',
				country: geosQueryStr,
				startDate: startDate,
				endDate: endDate
			}).then(function(response) {
				var allGeosStats = {
					Country: _getCpms(_.groupBy(response.data, '_id.country')),
					Region: _getCpms(_.groupBy(response.data, '_id.region')),
					City: _getCpms(_.groupBy(response.data, '_id.city'))
				};
				// Now bind to geoTree data to use in template
				function inner(treeData) {
					treeData.forEach(function(node) {
						node.stats = allGeosStats[node.nodeType][node._id];
						if (node.__children__ && node.__children__.length > 0) {
							inner(node.__children__);
						}
					});
				}
				inner(geoTree);
			});
		};

		//================= BEGIN Tree Search functions ===================//
		$scope.scrollToAnchor = function(id, treeType) {
			// yOffset set to the height of topbar, sorry had to hard code it
			$anchorScroll.yOffset = 55;
			var newHash = 'anchor-' + treeType + '-' + id;
			if ($location.hash() !== newHash) {
				$location.hash(newHash);
			} else {
				$anchorScroll();
			}
		};

		$scope.searchKeywords = {
			targetTree: '',
			blockedTree: '',
		};
		$scope.searchingStatus = {
			'geo_targets': false,
			'blocked_geos': false
		};
		$scope.searchTargetsTree = function() {
			$scope.geo_targets.clearSearchResult();
			var searchResultNode = $scope.geo_targets.searchNode($scope.searchKeywords.targetTree);
			$scope.searchingStatus.geo_targets = true;
			if (searchResultNode) {
				$scope.scrollToAnchor(searchResultNode._id, $scope.geo_targets.treeType);
			}
		};
		$scope.searchBlockedTree = function() {
			$scope.blocked_geos.clearSearchResult();
			var searchResultNode = $scope.blocked_geos.searchNode($scope.searchKeywords.blockedTree);
			$scope.searchingStatus.blocked_geos = true;
			if (searchResultNode) {
				$scope.scrollToAnchor(searchResultNode._id, $scope.blocked_geos.treeType);
			}
		};
		$scope.cancelSearchingStatus = function(treeType) {
			if (treeType === 'geo_targets') {
				$scope.searchKeywords.targetTree = '';
				$scope.geo_targets.clearSearchResult();
				$scope.searchingStatus.geo_targets = false;
			} else {
				$scope.searchKeywords.blockedTree = '';
				$scope.blocked_geos.clearSearchResult();
				$scope.searchingStatus.blocked_geos = false;
			}
		};
		//================== END Tree Search functions ====================//

		/**
		 * Wrapper to initialize geo targets tree and blocked geo tree
		 * Basically what it does for each tree are
		 * 1. set default expand level to 0, and
		 * 2. get stats for tree data
		 */
		$scope.initializeBothTrees = function() {
			// clear search result and search status
			$scope.geo_targets.clearSearchResult();
			$scope.searchingStatus.geo_targets = false;
			$scope.blocked_geos.clearSearchResult();
			$scope.searchingStatus.blocked_geos = false;

			// Initialization for geo_targets tree
			$scope.geo_targets.clearTreeData(function(err) {
				$scope.loadingTargetTree = true;
				$scope.geo_targets.fromGeosInCampaign($scope.advertiser._id, $scope.campaign._id, 'target')
				.then(function() {
					return $scope.getGeoTreeStats($scope.geo_targets.data, $scope.defaultDateRange);
				})
				.then(function() {
					$scope.geo_targets.setExpandLevel(0);
					$scope.loadingTargetTree = false;
				});
			});

			// Initialization for blocked_geos tree
			$scope.blocked_geos.clearTreeData(function(err) {
				$scope.loadingBlockTree = true;
				$scope.blocked_geos.fromGeosInCampaign($scope.advertiser._id, $scope.campaign._id, 'block')
				.then(function() {
					$scope.blocked_geos.setExpandLevel(0);
					$scope.loadingBlockTree = false;
				});
			});
		};

        //======================================================================//
        //================= END Tree Initialization Handlers ===================//
        //======================================================================//

        // Initialize targeting tree and blocked tree objects
		$scope.initializeBothTrees();

	}
]);