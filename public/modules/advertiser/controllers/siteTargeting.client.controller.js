/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('SiteTargetingController',
    ['$scope','$stateParams','Notify','$timeout','DndTreeWrapper','getSitesInCliqueBranch',
        'campaign','flattenSiteCliques','$TreeDnDConvert','OPENRTB', 'ngDialog','HourlyAdStat',
        'MongoTimeSeries','aggregationDateRanges','openSiteDescriptionDialog','CONTENT_CLIQUE_ID',
        function($scope, $stateParams, Notify, $timeout, DndTreeWrapper, getSitesInCliqueBranch,
                 campaign,flattenSiteCliques, $TreeDnDConvert, OPENRTB, ngDialog, HourlyAdStat,
                 MongoTimeSeries, aggregationDateRanges, openSiteDescriptionDialog, CONTENT_CLIQUE_ID){

            $scope.Math = Math;
            $scope.dirty = false;

            /**
             * Get Campaign from URL state params on load
             */
            $scope.advertiser = campaign.advertiser;
            $scope.campaignIndex = campaign.index;
            $scope.campaign = campaign.campaign;

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
            var _initializeSiteTreeNode = function(node, nodeType, parentId){
                // Create node clone
                var newNode = _.clone(node);

                // Add custom node properties
                newNode.parentId = parentId; //Needed for conversion to Site Tree DND format
                newNode.nodeType = nodeType;
                newNode.__hideSlider__ = false;
                //Set initial state as overridden so that it only can be set false
                // when slider is engaged by user
                newNode.__overridden__ = true;
                newNode.__lock__ = false;
                newNode.weight = node.weight || 1.0;

                //Properties used by blocked_inventory settings
                newNode.explicit = false;

                // Clear old children properties, since children will be repopulated
                // under unified param __children__ when converted into Site Tree DND format
                if (nodeType === 'Clique'){
                    delete newNode.sites;
                } else if (nodeType === 'Site'){
                    delete newNode.pages;
                } else if (nodeType === 'Page'){
                    delete newNode.placements;
                }

                // ========= BEGIN Node Instance Methods ======== //
                newNode.overrideChildWeights = function(){
                    var self = this;
                    if (self.nodeType === 'Clique' || self.nodeType === 'Site') {
                        self.__children__.forEach(function(node) {
                            node.weight = self.weight;
                            node.__overridden__ = true;
                            node.overrideChildWeights();
                        });
                    } else if (self.nodeType === 'Page'){
                        self.__children__.forEach(function(placement){
                            placement.__overridden__ = true;
                            placement.weight    = self.weight;
                        });
                    }
                };
                return newNode;
            };

            //====================================================//
            //=============== BEGIN SiteTree Class ===============//
            //====================================================//

            /**
             * Subclass of DndTreeWrapper with SiteTree specific methods
             *
             * @param treeData shared tree data model with tree-dnd directive.
             * @param control tree-dnd control object. Will default to base methods when bound to directive, but
             *      can pass in an object containing custom control methods.
             * @param expanding_property tree-dnd `expanding property` model
             * @param columns tree-dnd column model
             * @constructor
             */
            var SiteTree = function(treeData, control, expanding_property,columns){
                DndTreeWrapper.call(this, treeData, control, expanding_property, columns);
            };
            SiteTree.prototype = Object.create(DndTreeWrapper.prototype);

            /**
             * Loads this.data from API 'sitesincliquesbranch' endpoint response
             *
             * Basically flattens returned data, then passes to $TreeDnDConvert function
             * so it can be prepared for tree
             *
             * @param response
             * @param callback
             */
            SiteTree.prototype.fromSitesInCliquesBranchResponse = function(response, callback){
                var sitesInCliqueBranch = response.data;
                var flattened = [];
                sitesInCliqueBranch.forEach(function(clique){
                    var c = _initializeSiteTreeNode(clique, 'Clique',null);
                    flattened.push(c);
                    clique.sites.forEach(function(site){
                        var s = _initializeSiteTreeNode(site, 'Site',clique._id);
                        flattened.push(s);
                        site.pages.forEach(function(page){
                            var p = _initializeSiteTreeNode(page, 'Page',site._id);
                            flattened.push(p);
                            page.placements.forEach(function(placement){
                                var pl = _initializeSiteTreeNode(placement, 'Placement', page._id);
                                flattened.push(pl);
                            });
                        });
                    });
                });
                this.data = $TreeDnDConvert.line2tree(flattened, '_id', 'parentId');
                callback(null, this.data);
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
             * I think it's more efficient to do this non-recursively, despite how terrible
             * it looks
             *
             * @param targetsTree tree data
             * @param overrideFunction function which returns boolean indicating whether to throw
             *  node out or not.  `true` means node will be discarded if its unnecessary, `false` means
             *  keep it.
             */
            function pruneOverriddenChildren(targetsTree, overrideFunction){
                for (var a=0; a < targetsTree.length; a++){
                    var clique = targetsTree[a];
                    if (clique.children){
                        for (var b=0; b < clique.children.length; b++){
                            var site = clique.children[b];
                            if (site.children){
                                for (var c=0; c < site.children.length; c++) {
                                    var page = site.children[c];
                                    if (page.children){
                                        for (var d=0; d < page.children.length; d++){
                                            var placement = page.children[d];
                                            if (overrideFunction(placement)){
                                                page.children.splice(d,1);
                                                d = d-1;
                                            }
                                        }
                                        //Now work our way back up the tree to clean up
                                        //any nodes without any children left
                                        if (page.children.length === 0 && overrideFunction(page)){
                                            site.children.splice(c,1);
                                            c = c - 1;
                                        }
                                    }
                                }
                                if (site.children.length === 0 && overrideFunction(site)){
                                    clique.children.splice(b,1);
                                    b = b - 1;
                                }
                            }
                        }
                        if (clique.children.length === 0 && overrideFunction(clique)){
                            targetsTree.splice(a,1);
                            a = a -1;
                        }
                    }
                }
                return targetsTree;
            }

            /**
             * Converts treeData to Campaign.inventory_target schema format for saving.
             *
             * Recurses to lowest non-overridden level of each branch & saves branch, ignoring
             * all overridden children.
             *
             * @returns {*}
             */
            SiteTree.prototype.toInventoryTargetsSchema = function(callback){
                var self = this;
                function inner(thisSubtree, targetsTree){
                    targetsTree = targetsTree || [];
                    thisSubtree.forEach(function(node){
                        var weight = node.__overridden__ ? null: node.weight;
                        var targetObj = {
                            target: node._id,
                            weight: weight,
                            children: null,
                            __overridden__: node.__overridden__
                        };
                        var children = self.control.get_children(node);
                        targetsTree.push(targetObj);
                        if (children.length > 0){
                            targetObj.children = [];
                            inner(children, targetObj.children);
                        }
                    });
                    return targetsTree;
                }
                var targetsTree = inner(this.data);
                targetsTree = pruneOverriddenChildren(targetsTree, function(obj){ return obj.__overridden__; });
                return callback(null, targetsTree);
            };

            /**
             * Converts treeData to Campaign.blocked_inventory schema format for saving.
             *
             * Recurses to lowest non-overridden level of each branch & saves branch, ignoring
             * all overridden children.
             *
             * @returns {*}
             */
            SiteTree.prototype.toBlockedInventorySchema = function(callback){
                var self = this;
                function inner(thisSubtree, targetsTree){
                    targetsTree = targetsTree || [];
                    thisSubtree.forEach(function(node){
                        var targetObj = {
                            target: node._id,
                            children: null,
                            explicit: node.explicit
                        };
                        var children = self.control.get_children(node);
                        targetsTree.push(targetObj);
                        if (children.length > 0){
                            targetObj.children = [];
                            inner(children, targetObj.children);
                        }
                    });
                    return targetsTree;
                }
                var blockedTree = inner(this.data);
                blockedTree = pruneOverriddenChildren(blockedTree, function(obj){ return obj.explicit === false; });
                return callback(null, blockedTree);
            };

            /**
             * Applies all applicable weight overrides from parents to children,
             * depending on if parent weights have changes from prior state.  Meant to
             * only be used in $scope.$watch hook, where oldSiteTree is the older version
             * of the SiteTree instance which has been modified.
             *
             * @param oldSiteTree old SiteTree instance in $scope
             */
            SiteTree.prototype.applyParentOverrides = function(oldSiteTree) {
                var self = this;
                function inner(newSiteTree, oldSiteTree) {
                    if (newSiteTree){
                        for (var i = 0; i < newSiteTree.length; i++) {
                            var newNode = newSiteTree[i];
                            var oldNode = oldSiteTree.length > 0 ? oldSiteTree[i] : {};
                            if (newNode && oldNode){
                                if (newNode.weight !== oldNode.weight) {
                                    newNode.overrideChildWeights();
                                }
                                inner(newNode.__children__, oldNode.__children__);
                            }
                        }
                    }
                }
                return inner(self.data, oldSiteTree.data);
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
             * setting a weight for this node.
             *
             * The logic encapsulated in this method dictates that sliders be hidden
             * for any nodes that exist in the provided "Master" SiteTree instance.
             * The KEY ASSUMPTION here is that once a Master tree node no longer has
             * any children, it is removed from the master tree.
             *
             * The `SiteTree.reSiteTree.prototype.moveNodeAndEmptyAncestors` method does exactly this,
             * so as long as you use this method to clean up the master tree when
             * nodes are added to this tree, you're fine.
             *
             * @param masterTree master SiteTree instance w/ record of all nodes
             */
            SiteTree.prototype.setSliderHiders = function(masterTree){
                // If you need to unhide a node slider, you also need to unhide
                // all child node sliders, so this is just a quick method to hide
                // node & all child sliders recursively
                function unhideSliders(node){
                    node.__hideSlider__ = false;
                    if (node.__children__ && node.__children__.length > 0){
                        node.__children__.forEach(function(child){
                            unhideSliders(child);
                        });
                    }
                }

                function inner(masterTree, slaveTree){
                    slaveTree.forEach(function(node){
                        var existingNode = _.find(masterTree, function(n){
                            return n._id === node._id;
                        });
                        // If node exists in master tree, set hideSlider to true
                        // so user can't set weight on a node whose children are
                        // not all present
                        if (existingNode){
                            node.__hideSlider__ = true;
                            if (node.__children__.length > 0){
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
            //=============== END SiteTree Class =================//
            //====================================================//
            

            //==========================================================//
            //=============== BEGIN SiteTree Instances =================//
            //==========================================================//

            var cpmColumnDef = {
                    field:        "stats.cpm",
                    displayName:  'Avg. CPM',
                    titleTemplate: '<a href="#" tooltip="Average CPM on the Cliques Exchange for the {{ dateRanges[defaultDateRange].label }}">' +
                    '<i class="fa fa-line-chart"></i>&nbsp;Avg.<br/>CPM</a></div>',
                    titleClass:   'wd-xxs text-center',
                    cellClass:    'wd-xxs text-center',
                    cellTemplate: '<div ng-show="node.stats.cpm">{{ node.stats.cpm | currency:"$":2 }}</div>' +
                    '<small ng-hide="node.stats.cpm" class="text-muted"><i class="fa fa-heartbeat"> Not Enough Data</i></small>'
                };
            /**
             * SiteTree for All Available Sites tree vars
             */
            $scope.all_sites = new SiteTree([],
                {
                    target: function (node) {
                        SiteTree.prototype.moveNode($scope.all_sites, $scope.target_sites, node);
                        $scope.target_sites.setSliderHiders($scope.all_sites);
                        $scope.dirty = true;
                    },
                    block: function (node) {
                        node.explicit = true;
                        SiteTree.prototype.moveNode($scope.all_sites, $scope.blocked_sites, node);
                        //setting this node.explicit to true means this node will persist to DB
                        $scope.dirty = true;
                    }
                },
                {
                    field: "name",
                    cellClass: 'v-middle',
                    displayName: 'Name'
                },
                [
                    cpmColumnDef,
                    {
                        displayName:  'Actions',
                        cellTemplate: '<button type="button" class="btn btn-success btn-xs" ng-click="all_sites.control.target(node)" tooltip="Customize Bid">' +
                        '<i class="fa fa-sliders"></i></button>  ' +
                        '<button type="button" class="btn bg-danger btn-xs" ng-click="all_sites.control.block(node)" tooltip="Add to Block List">' +
                        '<i class="fa fa-ban"></i></button>'
                    }
                ]
            );

            /**
             * Event Handler to be bound to each slider `onStart` event.
             *
             * Sets __override__ param for node being changed to true, and
             * sets $scope.dirty to true as well.
             *
             * @param sliderId
             * @returns {*}
             */
            $scope.onStart = function(sliderId){
                function inner(tree){
                    tree.forEach(function(node){
                        if (node._id === sliderId){
                            node.__overridden__ = false;
                        } else {
                            if (node.__children__ && node.__children__.length > 0){
                                inner(node.__children__);
                            }
                        }
                    });
                }
                $scope.dirty = true;
                return inner($scope.target_sites.data);
            };

            /**
             * Target Sites tree vars
             */
            $scope.target_sites = new SiteTree([],
                {
                    remove: function (node) {
                        // Add whole ancestor branch to new tree, as necessary
                        SiteTree.prototype.moveNode($scope.target_sites, $scope.all_sites, node);
                        $scope.dirty = true;
                    }
                },
                {
                    field: "name",
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
             * SiteTree for Blocked Sites tree vars
             */
            $scope.blocked_sites = new SiteTree([],
                {
                    remove: function (node) {
                        SiteTree.prototype.moveNode($scope.blocked_sites, $scope.all_sites, node);
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
            //================= END SiteTree Instances =================//
            //==========================================================//

            $scope.positions = function(posCode){
                return _.find(OPENRTB.positions, function(pos_obj){
                    return pos_obj.code === posCode;
                });
            };

            $scope.getAllSitesHelp = function(){
                ngDialog.open({
                    className: 'ngdialog-theme-default',
                    template: 'modules/advertiser/views/partials/all-sites-help-text.html',
                    controller: ['$scope', function ($scope) {
                        $scope.campaign = $scope.ngDialogData.campaign;
                    }],
                    data: {campaign: $scope.campaign}
                });
            };

            $scope.getSiteDescription = function(site){
                openSiteDescriptionDialog(site);
            };

            /**
             * This scope watch handles overriding of child entity weights when parent is
             * changed.
             */
            $scope.$watch(function(scope){ return scope.target_sites; },function(newTargetSites, oldTargetSites) {
                if (newTargetSites.data.length > 0 && oldTargetSites.data.length > 0){
                    newTargetSites.applyParentOverrides(oldTargetSites);
                }
                $timeout(function () {
                    $scope.$broadcast('rzSliderForceRender');
                });
            }, true);

            /**
             * Save handler.  Converts target_sites SiteTree to inventory_targets DB format,
             * and converts blocked_sites to DB format, updates advertiser.
             */
            $scope.save = function(){
                $scope.target_sites.toInventoryTargetsSchema(function(err, targetsArray){
                    $scope.campaign.inventory_targets = targetsArray;
                    $scope.blocked_sites.toBlockedInventorySchema(function(err, blockedArray){
                        $scope.campaign.blocked_inventory = blockedArray;
                        $scope.advertiser.$update(function(){
                            $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                            $scope.dirty = false;
                            Notify.alert('Thanks! Your settings have been saved.',{});
                        }, function(errorResponse){
                            $scope.dirty = false;
                            Notify.alert('Error saving settings: ' + errorResponse.message,{status: 'danger'});
                        });
                    });
                });
            };

            //======================================================================//
            //================= BEGIN Tree Initialization Handlers =================//
            //======================================================================//

            /**
             * Populates contents of target_sites tree given a campaign's
             * inventory_target's settings from DB.
             *
             * @param inventory_targets
             * @param all_sites
             * @private
             */
            $scope.initializeTargetSiteTree = function(inventory_targets, all_sites){
                all_sites = all_sites || $scope.all_sites.data;
                inventory_targets.forEach(function(node){
                    // look up node by id in tree
                    var treeNode = _.find(all_sites, function(n){ return n._id === node.target; });
                    if (treeNode){
                        if (node.weight !== null){
                            //Have to check if node has already been moved to target tree, which will happen
                            //if parent node has a weight set.
                            //TODO: Might be a more efficient way to do this check if inventory_sites
                            //TODO: array is passed through recursive step
                            var target_node = $scope.target_sites.getNodeById(node.target);
                            var realNode;
                            if (target_node){
                                realNode = target_node;
                            } else {
                                // Only move nodes with weights set, others are just parent placeholders;
                                SiteTree.prototype.moveNode($scope.all_sites, $scope.target_sites, treeNode);
                                realNode = treeNode;
                            }
                            realNode.weight = node.weight;
                            realNode.__overridden__ = false;
                            realNode.overrideChildWeights();
                        }
                        if (node.children && node.children.length > 0){
                            $scope.initializeTargetSiteTree(node.children, treeNode.__children__);
                        }
                    }
                });
                // Set target_sites __hideSlider__ properties for nodes
                // not present in $scope.all_sites
                $scope.target_sites.setSliderHiders($scope.all_sites);
            };

            /**
             * Populates contents of blocked_sites tree given a campaign's
             * blocked_inventory's settings from DB.
             *
             * @param blocked_inventory
             * @param all_sites
             * @private
             */
            $scope.initializeBlockedInventoryTree = function(blocked_inventory, all_sites){
                all_sites = all_sites || $scope.all_sites.data;
                blocked_inventory.forEach(function(node){
                    // look up node by id in tree
                    var treeNode = _.find(all_sites, function(n){ return n._id === node.target; });
                    if (treeNode){
                        if (node.explicit){
                            // Only move nodes with weights set, others are just parent placeholders;
                            SiteTree.prototype.moveNode($scope.all_sites, $scope.blocked_sites, treeNode);
                            treeNode.explicit = true;
                        }
                        if (node.children && node.children.length > 0){
                            $scope.initializeBlockedInventoryTree(node.children, treeNode.__children__);
                        }
                    }
                });
            };

            $scope.dateRanges = aggregationDateRanges(user.tz);
            $scope.defaultDateRange = '30d';

            /**
             * Quick helper function to calculate CPMs for grouped hourlyadstats data
             * @param groupedData
             * @returns {{}}
             * @private
             */
            function _getCpms(groupedData){
                var cpms = {};
                for (var id in groupedData){
                    if (groupedData.hasOwnProperty(id)){
                        var imps = _.sumBy(groupedData[id], function(row){ return row.imps; });
                        var spend = _.sumBy(groupedData[id], function(row){ return row.spend; });
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
             * Gets impression, spend & CPM totals for given date range from HourlyAdStats,
             * groups by all Cliques, Sites, Pages & Placements for efficient retrieval
             *
             * @param siteTree
             * @param dateRange
             */
            $scope.getSiteTreeStats = function(siteTree, dateRange){
                // exit if was passed empty siteTree
                if (!siteTree || siteTree.length === 0) return;

                var startDate = $scope.dateRanges[dateRange].startDate;
                var endDate = $scope.dateRanges[dateRange].endDate;
                var cliques = [];
                siteTree.forEach(function(clique){
                    cliques.push(clique._id);
                });
                var cliquesQueryStr;
                if (cliques.length === 1){
                    cliquesQueryStr = cliques[0];
                } else {
                    cliquesQueryStr = '{in}' + cliques.join(',');
                }
                HourlyAdStat.pubSummaryQuery({
                    groupBy: 'pub_clique,site,page,placement',
                    pub_clique: cliquesQueryStr,
                    startDate: startDate,
                    endDate: endDate
                }).then(function (response) {
                    var allSitesStats = {
                        Clique: _getCpms(_.groupBy(response.data, '_id.pub_clique')),
                        Site: _getCpms(_.groupBy(response.data, '_id.site')),
                        Page: _getCpms(_.groupBy(response.data, '_id.page')),
                        Placement: _getCpms(_.groupBy(response.data, '_id.placement'))
                    };
                    // Now bind to siteTree data to use in template
                    function inner(treeData){
                        treeData.forEach(function(node){
                            node.stats = allSitesStats[node.nodeType][node._id];
                            if (node.__children__ && node.__children__.length > 0) {
                                inner(node.__children__);
                            }
                        });
                    }
                    inner(siteTree);
                });
            };

            /**
             * Wrapper to initialize all trees, starting with all sites, then moving
             * necessary nodes & branches to targets & blocked & initializing accordingly.
             */
            $scope.initializeAllTrees = function(){
                // Get all available sites to this campaign, then load into $scope.all_sites
                // SiteTree instance
                // TODO: Hacked right now to retrieve sites at top level of the Clique tree.
                getSitesInCliqueBranch(CONTENT_CLIQUE_ID).then(function(response){
                    $scope.all_sites.fromSitesInCliquesBranchResponse(response, function(err, data){
                        // Set default expand level to 0;
                        $scope.getSiteTreeStats(data, $scope.defaultDateRange);
                        $scope.all_sites.setExpandLevel(0);
                        $scope.target_sites.clearTreeData(function(err){
                            $scope.initializeTargetSiteTree($scope.campaign.inventory_targets);
                            $scope.getSiteTreeStats($scope.target_sites.data, $scope.defaultDateRange);
                        });
                        $scope.blocked_sites.clearTreeData(function(err){
                            $scope.initializeBlockedInventoryTree($scope.campaign.blocked_inventory);
                        });
                        $scope.dirty = false;
                    });
                });
            };

            //======================================================================//
            //================= END Tree Initialization Handlers ===================//
            //======================================================================//

            // Initialize the targeting tree objects
            $scope.initializeAllTrees();
        }
]);