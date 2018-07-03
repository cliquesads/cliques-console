/* global _, angular, moment, user, pricing */
'use strict';

angular.module('advertiser').controller('GeoTargetingController', [
	'$scope', '$state', 'Notify', 'campaign', 'ngDialog', '$window', '$rootScope', 'Country', 'Region', 'City', 'DndTreeWrapper', '$TreeDnDConvert', 'aggregationDateRanges', 'GeoAdStat', '$timeout', 'CampaignGeo',
	function($scope, $state, Notify, campaign, ngDialog, $window, $rootScope, Country, Region, City, DndTreeWrapper, $TreeDnDConvert, aggregationDateRanges, GeoAdStat, $timeout, CampaignGeo) {

		$scope.Math = Math;
		$scope.dirty = false;
		$scope.layout = $rootScope.geoTargetMapLayout ? $rootScope.geoTargetMapLayout : 'horizontal';
		$scope.setLayout = function() {
			// Change page layout 
			if ($scope.layout === 'horizontal') {
				$scope.layout = 'vertical';
				$scope.mapObject.options.width = $window.innerWidth - 294;
			} else {
				$scope.layout = 'horizontal';
				$scope.mapObject.options.width = ($window.innerWidth - 320) * 7 / 12;
			}
			$rootScope.geoTargetMapLayout = $scope.layout;
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
							countryNode.explicit = true;
							parentScope.blocked_geos.loadCountryGeoChildren(countryNode)
							.then(function() {
								// Also need to check if this blocked country has been targeted only, if so, remove it from the target_only_geos
								var targetOnlyData = parentScope.target_only_geos.data;
								for (var i = 0; i < targetOnlyData.length; i ++) {
									if (targetOnlyData[i]._id === countryNode._id) {
										parentScope.target_only_geos.data.splice(i, 1)
										break;
									}
								}
								parentScope.loadingBlockTree = false;
							});
						} else {
							// A region is selected to block,
							// should load just that region and its cities
							parentScope.loadingBlockTree = true;
							countryNode = parentScope.blocked_geos.addCountryNode($rootScope.selectedCountry);
							var regionNode = parentScope.blocked_geos.addRegionNode(parentScope.selectedGeo, countryNode);
							regionNode.__expanded__ = false;
							regionNode.explicit = true;
							parentScope.blocked_geos.loadRegionGeoChildren(regionNode)
							.then(function() {
								// Check if this blocked region has already been targeted only, if so, remove it from the target_only_geos
								var targetOnlyData = parentScope.target_only_geos.data;
								for (var i = 0; i < targetOnlyData.length; i ++) {
									if (targetOnlyData[i]._id === countryNode._id) {
										for (var j = 0; j < targetOnlyData[i].__children__.length; j ++) {
											if (targetOnlyData[i].__children__[j]._id === regionNode._id) {
												parentScope.target_only_geos.data[i].__children__.splice(j, 1);
												if (parentScope.target_only_geos.data[i].__children__.length === 0) {
													parentScope.target_only_geos.data.splice(i, 1);
												}
												break;
											}
										}
									}
								}
								parentScope.loadingBlockTree = false;
							});
						}
						$scope.closeThisDialog('success');
					};

					$scope.targetOnly = function() {
						parentScope.dirty = true;
						var countryNode;
						if (parentScope.selectedGeo.type === 'country') {
							// A country is selected to target only,
							// load the whole country and all its regions/cities
							parentScope.loadingTargetOnlyGeos = true;
							countryNode = parentScope.target_only_geos.addCountryNode(parentScope.selectedGeo);
							countryNode.explicit = true;
							parentScope.target_only_geos.loadCountryGeoChildren(countryNode)
							.then(function() {
								// Also need to check if this target-only country is in blocked list, if so, remove it from the blocked list
								var blockedData = parentScope.blocked_geos.data;
								for (var i = 0; i < blockedData.length; i ++) {
									if (blockedData[i]._id === countryNode._id) {
										parentScope.blocked_geos.data.splice(i, 1);
										break;
									}
								}

								parentScope.loadingTargetOnlyGeos = false;
							});
						} else {
							// A region is selected to target only,
							// should load just that region and its cities
							parentScope.loadingTargetOnlyGeos = true;
							countryNode = parentScope.target_only_geos.addCountryNode($rootScope.selectedCountry);
							var regionNode = parentScope.target_only_geos.addRegionNode(parentScope.selectedGeo, countryNode);
							regionNode.__expanded__ = false;
							regionNode.explicit = true;
							parentScope.target_only_geos.loadRegionGeoChildren(regionNode)
							.then(function() {
								// Check if the target only region is already blocked, if so, remove it from blocked_geos
								var blockedData = parentScope.blocked_geos.data;
								for (var i = 0; i < blockedData.length; i ++) {
									if (blockedData[i]._id === countryNode._id) {
										for (var j = 0; j < blockedData[i].__children__.length; j ++) {
											if (blockedData[i].__children__[j]._id === regionNode._id) {
												parentScope.blocked_geos.data[i].__children__.splice(j, 1);
												if (parentScope.blocked_geos.data[i].__children__.length === 0) {
													parentScope.blocked_geos.data.splice(i, 1);
												}
												break;
											}
										}
									}
								}

								parentScope.loadingTargetOnlyGeos = false;
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
				$scope.mapAvailable = false;
			}
			$scope.showActionsDialog();

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
		if ($scope.layout === 'vertical') {
			$scope.mapObject.options.width = $window.innerWidth - 294;
		} else {
			$scope.mapObject.options.width = ($window.innerWidth - 320) * 7 / 12;
		}

		//====================================================//
		//================ END of Map Settings ================//
		//====================================================//

		$scope.getAllGeosHelp = function() {
			ngDialog.open({
				className: 'ngdialog-theme-default dialogwidth600',
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
			$scope.blocked_geos.clearSearchResult();

			$scope.geo_targets.toGeoTargetsSchema(function(err, targetsArray) {
				$scope.campaign.geo_targets = targetsArray;
				$scope.blocked_geos.toBlockedGeosSchema(function(err, blockedArray) {
					$scope.campaign.blocked_geos = blockedArray;
					$scope.target_only_geos.toTargetOnlyGeosSchema(function(err, targetOnlyArray) {
						$scope.campaign.target_only_geos = targetOnlyArray;
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
			});
		};

		$scope.showWarningForCountryCustomization = function(node) {
			var parentScope = $scope;
			ngDialog.open({
				template: 'modules/advertiser/views/partials/customize-countrybid-warning.html',
				data: {
					countryNode: node
				},
				controller: ['$scope', function($scope) {
					$scope.countryNode = $scope.ngDialogData.countryNode;
					$scope.showSlider = function() {
						$scope.countryNode.__hideSlider__ = !$scope.countryNode.__hideSlider__;
						$scope.closeThisDialog('success');
					};

					$scope.cancel = function() {
						$scope.closeThisDialog('success');
					};
				}]
			});
		};
		

		//==========================================================//
		//================ BEGIN GeoTree Instances =================//
		//==========================================================//
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
		$scope.rzSliderCeil = Math.round($scope.campaign.max_bid / $scope.campaign.base_bid * 10) / 10;
		$scope.geo_targets = new GeoTree([], 
			{
				remove: function(node) {
					$scope.geo_targets.control.remove_node(node);
					$scope.dirty = true;
				}
			}, 'geo_targets');
		$scope.geo_targets.searchingStatus = 'NotSearching';

		/**
		 * GeoTree for blocked geo tree vars
		 */
		$scope.blocked_geos = new GeoTree([],
			{
				remove: function(node) {
					switch(node.nodeType) {
						case 'Country':
						break;
						case 'Region':
							var parentCountryId = node.parentId;
							for (var i = 0; i < $scope.blocked_geos.data.length; i ++) {
								if (parentCountryId === $scope.blocked_geos.data[i]._id) {
									$scope.blocked_geos.data[i].explicit = false;
									for (var j = 0; j < $scope.blocked_geos.data[i].__children__.length; j ++) {
										$scope.blocked_geos.data[i].__children__[j].explicit = true;	
									}
									break;
								}
							}
						break;
						case 'City':
							var parentRegionId = node.parentId;
							var parentRegionFound = false;
							for (var i = 0; i < $scope.blocked_geos.data.length; i ++) {
								for (var j = 0; j < $scope.blocked_geos.data[i].__children__.length; j ++) {
									if (parentRegionId === $scope.blocked_geos.data[i].__children__[j]._id) {
										$scope.blocked_geos.data[i].__children__[j].explicit = false;
										for (var k = 0; k < $scope.blocked_geos.data[i].__children__[j].__children__.length; k ++) {
											$scope.blocked_geos.data[i].__children__[j].__children__[k].explicit = true;
										}
										parentRegionFound = true;
										break;
									}
								}
								if (parentRegionFound) {
									break;
								}
							}
						break;
						default:
						break;
					}
					$scope.blocked_geos.control.remove_node(node);
					$scope.dirty = true;
				}
			}, 'blocked_geos');
		$scope.blocked_geos.searchingStatus = 'NotSearching';

		/**
		 * Target Only tree for unblocked countries
		 */
		$scope.target_only_geos = new GeoTree([],
			{
				remove: function(node) {
					switch(node.nodeType) {
						case 'Country':
						break;
						case 'Region':
							var parentCountryId = node.parentId;
							for (var i = 0; i < $scope.target_only_geos.data.length; i ++) {
								if (parentCountryId === $scope.target_only_geos.data[i]._id) {
									$scope.target_only_geos.data[i].explicit = false;
									for (var j = 0; j < $scope.target_only_geos.data[i].__children__.length; j ++) {
										$scope.target_only_geos.data[i].__children__[j].explicit = true;
									}
									break;
								}
							}
						break;
						case 'City':
							var parentRegionId = node.parentId;
							var parentRegionFound = false;
							for (var i = 0; i < $scope.target_only_geos.data.length; i ++) {
								for (var j = 0; j < $scope.target_only_geos.data[i].__children__.length; j ++) {
									if (parentRegionId === $scope.target_only_geos.data[i].__children__[j]._id) {
										$scope.target_only_geos.data[i].__children__[j].explicit = false;
										for (var k = 0; k < $scope.target_only_geos.data[i].__children__[j].__children__.length; k ++) {
											$scope.target_only_geos.data[i].__children__[j].__children__[k].explicit = true;
										}
										parentRegionFound = true;
										break;
									}
								}
								if (parentRegionFound) {
									break;
								}
							}
						break;
						default:
						break;
					}
					$scope.target_only_geos.control.remove_node(node);	
					$scope.dirty = true;
				}
			}, 'target_only_geos');
		$scope.target_only_geos.searchingStatus = 'NotSearching';

		//==========================================================//
		//================= END GeoTree Instances =================//
		//==========================================================//

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
		 * Quick helper function to calculate clearprices (CPM or CPC) for grouped geoadstat data
		 * @param groupedData
		 * @return {{}}
		 * @private
		 */
		function _getPriceData(groupedData) {
			var priceData = {};
			for (var id in groupedData) {
				if (groupedData.hasOwnProperty(id)) {
                    // calculate weighted average clearprice
					var imps = _.sumBy(groupedData[id], function(row) { return row.clearprice ? row.imps : 0; });
					var numerator = _.sumBy(groupedData[id], function(row) { return row.clearprice ? row.imps * row.clearprice : 0; });
					priceData[id] = {
						imps: imps,
						clearprice: numerator / imps
					};
				}
			}	
			return priceData;
		}

		/**
		 * Gets impression, spend & CPM totals for given date range from GeoAdStat,
		 * groups by all Countries, Regions & Cities for efficient retrieval
		 *
		 * @param geoTree
		 * @param dateRange
		 */
		$scope.getGeoTreeStats = function(geoTree, dateRange) {
			// exit if was passed empty geoTree
			if (!geoTree || geoTree.length === 0) return;	

			var startDate = $scope.dateRanges[dateRange].startDate;
			var endDate = $scope.dateRanges[dateRange].endDate;
			var countryIds = [],
				regionIds = [];
			geoTree.forEach(function(geo) {
				countryIds.push(geo._id);
				if (geo.__children__) {
					geo.__children__.forEach(function(region) {
						regionIds.push(region._id);
					});
				}
			});
			var countryQueryString = '',
				regionQueryString = '';
			if (countryIds.length === 1) {
				countryQueryString = countryIds[0];
			} else if (countryIds.length > 1) {
				countryQueryString = '{in}' + countryIds.join(',');
			}
			if (regionIds.length === 1) {
				regionQueryString = regionIds[0];
			} else if (regionIds.length > 1) {
				regionQueryString = '{in}' + regionIds.join(',');
			}
			return GeoAdStat.pubSummaryQuery({
				groupBy: 'country,region,city',
				country: countryQueryString,
				region: regionQueryString,
				startDate: startDate,
				endDate: endDate
			}).then(function(response) {
				var allGeosStats = {
					Country: _getPriceData(_.groupBy(response.data, '_id.country')),
					Region: _getPriceData(_.groupBy(response.data, '_id.region')),
					City: _getPriceData(_.groupBy(response.data, '_id.city'))
				};
				// Now bind to geoTree data to use in template
				function inner(treeData) {
					treeData.forEach(function(node) {
						if (node.nodeType !== 'City') {
							node.stats = allGeosStats[node.nodeType][node._id];
						} else {
							node.stats = allGeosStats[node.nodeType][node.name];
						}
						if (node.__children__ && node.__children__.length > 0) {
							inner(node.__children__);
						}
					});
				}
				inner(geoTree);
			});
		};

		//================= BEGIN Tree Search functions ===================//
		$scope.searchTargetsTree = function() {
			var searchResultNode = $scope.geo_targets.searchNode($scope.geo_targets.searchKeyword);
			if (searchResultNode) {
				$scope.geo_targets.searchingStatus = 'FoundResult';
				$scope.geo_targets.updateNodesSearchVisibility();
			} else {
				$scope.geo_targets.searchingStatus = 'NotFound';
			}
		};
		$scope.searchBlockedTree = function() {
			var searchResultNode = $scope.blocked_geos.searchNode($scope.blocked_geos.searchKeyword);
			if (searchResultNode) {
				$scope.blocked_geos.searchingStatus = 'FoundResult';
				$scope.blocked_geos.updateNodesSearchVisibility();
			} else {
				$scope.blocked_geos.searchingStatus = 'NotFound';
			}
		};
		$scope.searchTargetOnlyGeosTree = function() {
			var searchResultNode = $scope.target_only_geos.searchNode($scope.target_only_geos.searchKeyword);
			if (searchResultNode) {
				$scope.target_only_geos.searchingStatus = 'FoundResult';
				$scope.target_only_geos.updateNodesSearchVisibility();
			} else {
				$scope.target_only_geos.searchingStatus = 'NotFound';
			}
		};
		$scope.cancelGeoTargetsSearchingStatus = function() {
			$scope.geo_targets.clearSearchResult();
			$scope.geo_targets.updateNodesSearchVisibility();
		};
		$scope.cancelGeoBlockedSearchingStatus = function() {
			$scope.blocked_geos.clearSearchResult();
			$scope.blocked_geos.updateNodesSearchVisibility();
		};
		$scope.cancelTargetOnlySearchingStatus = function() {
			$scope.target_only_geos.clearSearchResult();
			$scope.target_only_geos.updateNodesSearchVisibility();
		};
		//================== END Tree Search functions ====================//

		/**
		 * Wrapper to initialize geo targets tree and blocked geo tree
		 * Basically what it does for each tree are
		 * 1. set default expand level to 0, and
		 * 2. get stats for tree data
		 */
		$scope.initializeAllTrees = function() {
			// clear search result and search status
			$scope.geo_targets.clearSearchResult();
			$scope.blocked_geos.clearSearchResult();
			$scope.target_only_geos.clearSearchResult();

			// Initialization for geo_targets tree
			$scope.geo_targets.clearTreeData(function(err) {
				$scope.loadingTargetTree = true;
				$scope.geo_targets.fromGeosInCampaign($scope.advertiser._id, $scope.campaign._id, 'target')
				.then(function() {
					return $scope.getGeoTreeStats($scope.geo_targets.data, $scope.defaultDateRange);
				})
				.then(function() {
					$scope.geo_targets.setExpandLevel(0);
					$scope.geo_targets.setCountrySliderHiders();
					$scope.loadingTargetTree = false;
				});
			});

			// Initialization for blocked_geos tree
			$scope.blocked_geos.clearTreeData(function(err) {
				$scope.loadingBlockTree = true;
				$scope.blocked_geos.fromGeosInCampaign($scope.advertiser._id, $scope.campaign._id, 'block')
				.then(function() {
					// Now load regions for country, and load cities for regions
					for (var i = 0; i < $scope.blocked_geos.data.length; i ++) {
						$scope.blocked_geos.loadCountryGeoChildren($scope.blocked_geos.data[i]);
					}
					$scope.blocked_geos.setExpandLevel(0);
					$scope.loadingBlockTree = false;
				});
			});

			// Initialization for target_only_geos tree
			$scope.target_only_geos.clearTreeData(function(err) {
				$scope.loadingTargetOnlyGeos = true;
				$scope.target_only_geos.fromGeosInCampaign($scope.advertiser._id, $scope.campaign._id, 'targetOnly')
				.then(function() {
					for (var i = 0; i < $scope.target_only_geos.data.length; i ++) {
						$scope.target_only_geos.loadCountryGeoChildren($scope.target_only_geos.data[i]);
					}
					$scope.target_only_geos.setExpandLevel(0);
					$scope.loadingTargetOnlyGeos = false;
				});
			});
		};

        //======================================================================//
        //================= END Tree Initialization Handlers ===================//
        //======================================================================//

        // Initialize targeting tree and blocked tree objects
		$scope.initializeAllTrees();

	}
]);