/* global _, angular, moment, user, pricing */
'use strict';

angular.module('advertiser').controller('GeoTargetingController',
	function($scope, $state, $q, Notify, campaign, ngDialog, $window, $rootScope, Country, Region, City, DMA,
			 aggregationDateRanges, GeoAdStat, GeoTree, $timeout, CampaignGeo) {

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

		//=================================================================//
        //================ BEGIN Actions Dialog Controller ================//
        //=================================================================//

		$scope.showActionsDialog = function() {
			var parentScope = $scope;
			// Show the dialog to customize or block bidding for a targetted area
			ngDialog.open({
				template: 'modules/advertiser/views/partials/geo-target-actions-dialog.html',
				data: {
					selectedGeo: $scope.selectedGeo
				},
				controller: ['$scope', '$rootScope', 'ngDialog', function($scope, $rootScope, ngDialog) {
					$scope.selectedGeo = $scope.ngDialogData.selectedGeo;

                    /**
					 * Handler function for "Customize Bid" button
                     */
					$scope.customizeBiddingForGeo = function() {
						parentScope.dirty = true;
						var countryNode;
						if ($scope.selectedGeo.type === 'country') {
							// A country is selected to customize,
							// load the whole country and all its regions/cities
							$rootScope.loadingTargetTree = true;
							countryNode = parentScope.geo_targets.addCountryNode(parentScope.selectedGeo);
							parentScope.geo_targets.loadCountryGeoChildren(countryNode)
							.then(function() {
								// get cpms for each loaded geo
								return parentScope.getGeoTreeStats(parentScope.geo_targets.data, parentScope.defaultDateRange);
							})
							.then(function() {
								$rootScope.loadingTargetTree = false;
							});
						} else {
							// A region is selected to customize,
							// should load just that region and its cities
							$rootScope.loadingTargetTree = true;
							countryNode = parentScope.geo_targets.addCountryNode($rootScope.selectedCountry);
							var regionNode = parentScope.geo_targets.addRegionNode($scope.selectedGeo, countryNode);
							regionNode.__expanded__ = false;
							parentScope.geo_targets.loadRegionGeoChildren(regionNode)
							.then(function() {
								// get cpms for each loaded geo
								return parentScope.getGeoTreeStats(parentScope.geo_targets.data, parentScope.defaultDateRange);
							})
							.then(function() {
								$rootScope.loadingTargetTree = false;
							});
						}
						$scope.closeThisDialog('success');
					};

                    /**
					 * Handler function for "Blacklist" button. If whitelist is present, will show confirmation
					 * dialog to ensure user intends to clear whitelist by blacklisting geos.
                     */
					$scope.blockGeo = function() {
						parentScope.dirty = true;
						var countryNode;
						var promise;
						if (parentScope.target_only_geos.data.length){
							promise = ngDialog.openConfirm({
								data: {
									selectedGeo: $scope.selectedGeo,
									target_only_geos: parentScope.target_only_geos,
								},
								controller: function($scope){
									$scope.selectedGeo = $scope.ngDialogData.selectedGeo;
									$scope.target_only_geos = $scope.ngDialogData.target_only_geos.data;
								},
								template: '\
								<br>\
								<p>By blacklisting {{ selectedGeo.name }}, the following whitelist will be cleared:</p>\
								<ul><li ng-repeat="geo in target_only_geos">\
								<strong>{{ geo.name }} ({{ geo.__children__.length }} {{ geo.nodeType == "Country" ? "Regions" : "Cities" }})</strong>\
								</li></ul>\
								<p class="text-center">\
									<button class="btn btn-lg btn-primary" ng-click="confirm()">OK</button>\
									<button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
								</p>',
								plain: true
							});
						} else {
							promise = $q.when([]);
						}
						promise.then(function(){
							if (parentScope.selectedGeo.type === 'country') {
								// A country is selected to block,
								// load the whole country and all its regions/cities
								$rootScope.loadingBlockTree = true;
								countryNode = parentScope.blocked_geos.addCountryNode(parentScope.selectedGeo);
								countryNode.explicit = true;
								parentScope.blocked_geos.loadCountryGeoChildren(countryNode)
									.then(function() {
										// clear targetOnlyGeos
										parentScope.target_only_geos.data = [];
										$rootScope.loadingBlockTree = false;
									});

							} else {
								// A region is selected to block,
								// should load just that region and its cities
								$rootScope.loadingBlockTree = true;
								countryNode = parentScope.blocked_geos.addCountryNode($rootScope.selectedCountry);
								var regionNode = parentScope.blocked_geos.addRegionNode(parentScope.selectedGeo, countryNode);
								regionNode.__expanded__ = false;
								regionNode.explicit = true;
								parentScope.blocked_geos.loadRegionGeoChildren(regionNode)
									.then(function() {
										parentScope.target_only_geos.data = [];
										$rootScope.loadingBlockTree = false;
									});
							}
							$scope.closeThisDialog('success');
						});
					};

                    /**
					 * Handler function for Whitelist button. Will show dialog if blacklist is non-empty to ensure
					 * user intends to clear blacklist by adding whitelist.
                     */
					$scope.targetOnly = function() {
						var countryNode;
						var promise;
						if (parentScope.blocked_geos.data.length){
							promise = ngDialog.openConfirm({
								data: {
									selectedGeo: $scope.selectedGeo,
									blocked_geos: parentScope.blocked_geos,
								},
								controller: function($scope){
									$scope.selectedGeo = $scope.ngDialogData.selectedGeo;
									$scope.blocked_geos = $scope.ngDialogData.blocked_geos.data;
								},
								template: '\
								<br>\
								<p>By whitelisting {{ selectedGeo.name }}, the following blacklist will be cleared:</p>\
								<ul><li ng-repeat="geo in blocked_geos">\
								<strong>{{ geo.name }} ({{ geo.__children__.length }} {{ geo.nodeType == "Country" ? "Regions" : "Cities" }})</strong>\
								</li></ul>\
								<p class="text-center">\
									<button class="btn btn-lg btn-primary" ng-click="confirm()">OK</button>\
									<button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
								</p>',
								plain: true
							});
						} else {
							promise = $q.when([]);
						}
						promise.then(function() {
                            parentScope.dirty = true;
							if (parentScope.selectedGeo.type === 'country') {
								// A country is selected to target only,
								// load the whole country and all its regions/cities
								$rootScope.loadingTargetOnlyGeos = true;
								countryNode = parentScope.target_only_geos.addCountryNode($scope.selectedGeo);
								countryNode.explicit = true;
								parentScope.target_only_geos.loadCountryGeoChildren(countryNode)
									.then(function () {
										// Clear blacklist
										parentScope.blocked_geos.data = [];
										parentScope.loadingTargetOnlyGeos = false;
									});
							} else {
								// A region is selected to target only,
								// should load just that region and its cities
								$rootScope.loadingTargetOnlyGeos = true;
								countryNode = parentScope.target_only_geos.addCountryNode($rootScope.selectedCountry);
								var regionNode = parentScope.target_only_geos.addRegionNode($scope.selectedGeo, countryNode);
								regionNode.__expanded__ = false;
								regionNode.explicit = true;
								parentScope.target_only_geos.loadRegionGeoChildren(regionNode)
									.then(function () {
										// Clear blacklist
										parentScope.blocked_geos.data = [];
										$rootScope.loadingTargetOnlyGeos = false;
									});
							}
							$scope.closeThisDialog('success');
						});
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

        //====================================================//
        //================ BEGIN DMA Stuff ===================//
        //====================================================//

        // control var for DMA-based targeting
        $scope.dmaTargeting = false;
		$scope.$watch('dmaTargeting', function(newVal, oldVal){
		   if (oldVal !== newVal && newVal && !$scope.dmas){
		       $scope.dmas = DMA.query({ sort_by: 'name' });
           }
        });

		$scope.dmaSearch = {
		    foundSome: false,
		    active: false,
            keyword: ''
        };

		$scope.searchDMAs = function(){
            $scope.dmaSearch.foundSome = false;
            $scope.dmaSearch.active = true;
            var keyword = $scope.dmaSearch.keyword.toLowerCase();
            $scope.dmas.forEach(function(dma){
                var match = dma.name.toLowerCase().search(keyword) > -1 || dma.code.toString().search(keyword) > -1;
                if (match) {
                    $scope.dmaSearch.foundSome = true;
                    dma.keywordMatch = true;
                }
            });
        };

        $scope._clearSearchResults = function(){
            $scope.dmas.forEach(function(dma){
                dma.keywordMatch = false;
            });
        };

        $scope.cancelSearch = function(){
            $scope.dmaSearch.keyword = '';
            $scope.dmaSearch.active = false;
            $scope.dmaSearch.foundSome = false;
            $scope._clearSearchResults();
        };

        // Namespace for all action functions to target/block
        // DMAs. Each function adds to one of the geoTree instances
        // in scope.
        $scope.dmaActions = {
            targetOnly: function(dma){
                $scope.dirty = true;
                // A country is selected to target only,
                // load the whole country and all its regions/cities
                $rootScope.loadingTargetOnlyGeos = true;
                var countryNode = $scope.target_only_geos.addCountryNode($rootScope.selectedCountry);
                var dmaNode = $scope.target_only_geos.addDMANode(dma, countryNode);
                dmaNode.explicit = true;
                // Clear blacklist
                $scope.blocked_geos.data = [];
                $rootScope.loadingTargetOnlyGeos = false;
            },
            block: function(dma){
                $scope.dirty = true;
                $rootScope.loadingBlockTree = true;
                var countryNode = $scope.blocked_geos.addCountryNode($rootScope.selectedCountry);
                var dmaNode = $scope.blocked_geos.addDMANode(dma, countryNode);
                dmaNode.explicit = true;
                $scope.target_only_geos.data = [];
                $rootScope.loadingBlockTree = false;
            },
            customizeBidding: function(dma){
                $scope.dirty = true;
                // A region is selected to customize,
                // should load just that region and its cities
                $rootScope.loadingTargetTree = true;
                var countryNode = $scope.geo_targets.addCountryNode($rootScope.selectedCountry);
                var dmaNode = $scope.geo_targets.addDMANode(dma, countryNode);
                // get cpms for each loaded geo
                $scope.getGeoTreeStats($scope.geo_targets.data, $scope.defaultDateRange)
                    .then(function() {
                        $rootScope.loadingTargetTree = false;
                    });
            }
        };

        //====================================================//
        //================ END DMA Stuff =====================//
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
				$scope.campaign.geo_targets = targetsArray[0];
				$scope.campaign.dma_targets = targetsArray[1];
				$scope.blocked_geos.toBlockedGeosSchema(function(err, blockedArray) {
					$scope.campaign.blocked_geos = blockedArray[0];
					$scope.campaign.blocked_dmas = blockedArray[1];
					$scope.target_only_geos.toTargetOnlyGeosSchema(function(err, targetOnlyArray) {
						$scope.campaign.target_only_geos = targetOnlyArray[0];
						$scope.campaign.target_only_dmas = targetOnlyArray[1];
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

		$scope.lazyLoadCities = function(regionNode, geoTree) {
			if (!regionNode.citiesLoaded) {
				return CampaignGeo.getRegionCities(regionNode._id)
				.then(function(response) {
					var cities = response.data;
					var sortedCities = _.orderBy(cities, 'name', 'asc');
					sortedCities.forEach(function(city) {
						geoTree.addCityNode(city, regionNode);
					});
					regionNode.citiesLoaded = true;
					regionNode.__expanded__ = !regionNode.__expanded__;
					if (regionNode.__expanded__) {
						regionNode.regionNodeIcon = 'fa fa-lg fa-minus';
					} else {
						regionNode.regionNodeIcon = 'fa fa-lg fa-plus-circle';
					}
				});
			} else {
				regionNode.__expanded__ = !regionNode.__expanded__;
				if (regionNode.__expanded__) {
					regionNode.regionNodeIcon = 'fa fa-lg fa-minus';
				} else {
					regionNode.regionNodeIcon = 'fa fa-lg fa-plus-circle';
				}
			}
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
				},
				toggleExpandRegion: function(node) {
					$scope.lazyLoadCities(node, $scope.geo_targets);
				}
			}, 'geo_targets');
		$scope.geo_targets.searchingStatus = 'NotSearching';

		var _removeFunction = function(tree){
		    return function(node) {
                $scope[tree].control.remove_node(node);
                switch(node.nodeType) {
                    case 'Country':
                        break;
                    case 'Region':
                        var parentCountryId = node.parentId;
                        for (var i = 0; i < $scope[tree].data.length; i ++) {
                            // Set parents explicit to false and children to true if a child is removed
                            if (parentCountryId === $scope[tree].data[i]._id) {
                                $scope[tree].data[i].explicit = false;
                                for (var j = 0; j < $scope[tree].data[i].__children__.length; j ++) {
                                    $scope[tree].data[i].__children__[j].explicit = true;
                                }
                                // Remove parent node if it's empty & has no children
                                if ($scope[tree].data[i].__children__.length === 0){
                                    $scope[tree].data.splice(i, 1);
                                }
                                break;
                            }
                        }
                        break;
                    case 'DMA':
                        parentCountryId = node.parentId;
                        for (var i = 0; i < $scope[tree].data.length; i ++) {
                            if (parentCountryId === $scope[tree].data[i]._id) {
                                // NOTE: Currently DMA's can only be set explicitly, so don't need to
                                // set explicit vals on removal

                                // Remove parent node if it's empty & has no children
                                if ($scope[tree].data[i].__children__.length === 0){
                                    $scope[tree].data.splice(i, 1);
                                }
                                break;
                            }
                        }
                        break;
                    case 'City':
                        var parentRegionId = node.parentId;
                        var parentRegionFound = false;
                        for (var i = 0; i < $scope[tree].data.length; i ++) {
                            for (var j = 0; j < $scope[tree].data[i].__children__.length; j ++) {
                                if (parentRegionId === $scope[tree].data[i].__children__[j]._id) {
                                    $scope[tree].data[i].__children__[j].explicit = false;
                                    for (var k = 0; k < $scope[tree].data[i].__children__[j].__children__.length; k ++) {
                                        $scope[tree].data[i].__children__[j].__children__[k].explicit = true;
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
                $scope.dirty = true;
            };
        };
		/**
		 * GeoTree for blocked geo tree vars
		 */
		$scope.blocked_geos = new GeoTree([],
			{
				remove: _removeFunction('blocked_geos'),
				toggleExpandRegion: function(node) {
					$scope.lazyLoadCities(node, $scope.blocked_geos);
				}
			}, 'blocked_geos');
		$scope.blocked_geos.searchingStatus = 'NotSearching';

		/**
		 * Target Only tree for unblocked countries
		 */
		$scope.target_only_geos = new GeoTree([],
			{
				remove: _removeFunction('target_only_geos'),
				toggleExpandRegion: function(node) {
					$scope.lazyLoadCities(node, $scope.target_only_geos);	
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
				regionIds = [],
                dmaIds = [];
			geoTree.forEach(function(geo) {
				countryIds.push(geo._id);
				if (geo.__children__) {
					geo.__children__.forEach(function(region) {
                        if (region.nodeType === 'DMA'){
                            dmaIds.push(region._id);
                        } else {
                            regionIds.push(region._id);
                        }
					});
				}
			});
			var countryQueryString = '',
				regionQueryString = '',
                dmaQueryString = '';
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
            if (dmaIds.length === 1) {
                dmaQueryString = dmaIds[0];
            } else if (dmaIds.length > 1) {
                dmaQueryString = '{in}' + dmaIds.join(',');
            }

            var geoTreeStatsPromise = GeoAdStat.pubSummaryQuery({
                groupBy: 'country,region,city',
                country: countryQueryString,
                region: regionQueryString,
                startDate: startDate,
                endDate: endDate
            });

            var dmaStatsPromise = dmaQueryString ? GeoAdStat.pubSummaryQuery({
                groupBy: 'dma',
                dma: dmaQueryString,
                startDate: startDate,
                endDate: endDate
            }) : $q.when([]);

			return $q.all([geoTreeStatsPromise, dmaStatsPromise]).then(function(responses){
                var geoTreeResponse = responses[0],
                    dmaResponse = responses[1];
                var allGeosStats = {
                    Country: _getPriceData(_.groupBy(geoTreeResponse.data, '_id.country')),
                    Region: _getPriceData(_.groupBy(geoTreeResponse.data, '_id.region')),
                    City: _getPriceData(_.groupBy(geoTreeResponse.data, '_id.city'))
                };
                if (dmaResponse){
                    allGeosStats.DMA = _getPriceData(_.groupBy(dmaResponse.data, '_id.dma'));
                }
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
                    $scope.dirty = false;
				});
			});

			// Initialization for blocked_geos tree
			$scope.blocked_geos.clearTreeData(function(err) {
				$rootScope.loadingBlockTree = true;
				$scope.blocked_geos.fromGeosInCampaign($scope.advertiser._id, $scope.campaign._id, 'block')
				.then(function() {
					// Now load regions for country, and load cities for regions
					for (var i = 0; i < $scope.blocked_geos.data.length; i ++) {
                        if ($scope.blocked_geos.data[i].explicit) {
                            $scope.blocked_geos.loadCountryGeoChildren($scope.blocked_geos.data[i]);
                        }
                    }
					$scope.blocked_geos.setExpandLevel(0);
					$rootScope.loadingBlockTree = false;
					$scope.dirty = false;
				});
			});

			// Initialization for target_only_geos tree
			$scope.target_only_geos.clearTreeData(function(err) {
				$rootScope.loadingTargetOnlyGeos = true;
				$scope.target_only_geos.fromGeosInCampaign($scope.advertiser._id, $scope.campaign._id, 'targetOnly')
				.then(function() {
					for (var i = 0; i < $scope.target_only_geos.data.length; i ++) {
						if ($scope.target_only_geos.data[i].explicit){
                            $scope.target_only_geos.loadCountryGeoChildren($scope.target_only_geos.data[i]);
						}
					}
					$scope.target_only_geos.setExpandLevel(0);
					$rootScope.loadingTargetOnlyGeos = false;
                    $scope.dirty = false;
				});
			});
		};

        //======================================================================//
        //================= END Tree Initialization Handlers ===================//
        //======================================================================//

        // Initialize targeting tree and blocked tree objects
		$scope.initializeAllTrees();

	}
);