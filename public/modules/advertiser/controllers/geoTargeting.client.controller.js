/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('GeoTargetingController', [
	'$scope', '$state', 'Notify', 'campaign', 'ngDialog', '$window', '$rootScope', 'Country', 'Region', 'City', 'DndTreeWrapper', '$TreeDnDConvert', 'OPENRTB', 'aggregationDateRanges', 'GeoAdStat', '$timeout',
	function($scope, $state, Notify, campaign, ngDialog, $window, $rootScope, Country, Region, City, DndTreeWrapper, $TreeDnDConvert, OPENRTB, aggregationDateRanges, GeoAdStat, $timeout) {

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
						var oldNode = oldGeoTree.length > 0 ? oldGeoTree[i] : {};
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
					// Add whole ancestor branch to new tree, as necessary
					GeoTree.prototype.moveNode($scope.geo_targets, null, node);
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
				    '<div class="text-muted" ng-show="node.__hideSlider__ && !node.__expanded__"><small><i class="fa fa-plus-circle"></i><em>&nbsp;&nbsp;Expand to view & set bids</em></small></div>'
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
				    cellTemplate: '<button type="button" class="btn btn-xs bg-gray-light" ng-click="target_sites.control.remove(node)" tooltip="Clear Bids">' +
				    '<i class="fa fa-lg fa-remove"></i></button>'
				}
			]
		);

		/**
		 * GeoTree for blocked geo tree vars
		 */
		$scope.blocked_geos = new GeoTree([],
			{
				remove: function(node) {
					GeoTree.prototype.moveNode($scope.blocked_geos, null, node);
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
			    cellTemplate: '<button type="button" class="btn btn-xs bg-gray-light" ng-click="blocked_sites.control.remove(node)" tooltip="Unblock">' +
			    '<i class="fa fa-lg fa-remove"></i></button>'
			}]
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
			GeoAdStat.pubSummaryQuery({
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
	}
]);