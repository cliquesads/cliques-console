/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('SiteTargetingController',
    ['$scope','$stateParams','Notify','getSitesInCliqueBranch','Campaign','flattenSiteCliques','$TreeDnDConvert','OPENRTB', 'ngDialog',
        function($scope, $stateParams, Notify, getSitesInCliqueBranch, Campaign,flattenSiteCliques, $TreeDnDConvert, OPENRTB, ngDialog){
            $scope.Math = Math;
            $scope.dirty = false;

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
                            node.overrideChildWeights();
                        });
                    } else if (self.nodeType === 'Page'){
                        self.__children__.forEach(function(placement){
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
             * Made most sense to wrap treeData in class containing some methods to handle
             * commonly-used logic around this particular data structure
             *
             * @param treeData
             * @param control
             * @param expanding_property
             * @param columns
             * @constructor
             */
            var SiteTree = function(treeData, control, expanding_property,columns){
                this.data = treeData || [];
                this.control = control || {};
                this.expanding_property = expanding_property || {};
                this.columns = columns || [];
            };

            /**
             * Loads this.data from API 'sitesincliquesbranch' endpoint response
             *
             * Basically flattens returned data, then passes to $TreeDnDConvert function
             * so it can be prepared for tree
             *
             * @param response
             */
            SiteTree.prototype.fromSitesInCliquesBranchResponse = function(response){
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
            };

            /**
             * Converts treeData to Campaign.inventory_target schema format for saving.
             *
             * @returns {*}
             */
            SiteTree.prototype.toInventoryTargetsSchema = function(){
                var self = this;
                function inner(thisSubtree, targetsTree){
                    targetsTree = targetsTree || [];
                    thisSubtree.forEach(function(node){
                        var targetObj = {
                            target: node._id,
                            weight: node.weight || null,
                            children: null
                        };
                        var children = self.control.get_children(node);
                        targetsTree.push(targetObj);
                        if (children.length > 0){
                            targetObj.children = [];
                            inner(children, targetObj.children);
                        }
                    });
                    return targetsTree
                }
                return inner(this.data);
            };

            /**
             * Sort of BS that the Tree DND plugin doesn't have this, so have to write silly little
             * function just to set the initial expand level.
             */
            SiteTree.prototype.setExpandLevel = function(level, _currentLevel, _treeData){
                var self = this;
                _treeData = _treeData || self.data;
                _currentLevel = _currentLevel || 0;
                _treeData.forEach(function(node){
                    node.__expanded__ = (_currentLevel < level);
                    if (node.__children__){
                        node.__children__ = self.setExpandLevel(level, _currentLevel + 1, node.__children__);
                    }
                });
                return _treeData;
            };

            /**
             * Fucking control get_parent doesn't work properly for nested nodes,
             * so have to write my own function to get parent
             *
             * This could be written more elegantly, but it works. JS recursion is wonky.
             */
            SiteTree.prototype.getNodeById = function(id, _tree){
                _tree = _tree || this.data;
                var parent = null;
                for (var i=0; i < _tree.length; i++){
                    var n = _tree[i];
                    if (n._id === id){
                        parent = n;
                        break
                    } else if (n.__children__){
                        parent = this.getNodeById(id, n.__children__);
                        if (parent) break
                    }
                }
                return parent;
            };

            /**
             * Gets array of ancestor nodes, each w/ __children__ consisting of
             * only descendants in specified branch
             * @param node
             * @param _ancestors
             * @returns {*}
             */
            SiteTree.prototype.getAncestorBranch = function(node, _ancestors){
                _ancestors = _ancestors || [node];
                var parent = this.control.get_parent(node);
                if (parent) {
                    var parentClone = _.clone(parent);
                    parentClone.__children__ = [node];
                    _ancestors.unshift(parentClone);
                    return this.getAncestorBranch(parentClone, _ancestors);
                } else {
                    return _ancestors;
                }
            };

            /**
             * Effectively "merges" an entire tree branch into this tree.
             *
             * Given a array representing branch of nodes, will check existence of each ancestor
             * in THIS tree. If an ancestor is missing, it will be added to this tree using
             * this.control.add_node().
             *
             * Will also add all children of last node in branch array to same node's children in
             * this tree.
             *
             * This means that if node A is the last element in `branch`, but node A exists
             * in this.data, node A's children in this.data will consist of the union of `branch`
             * node A's children & its own.
             *
             * @param branch array of nodes in branch (use tree.getAncestorBranch to generate)
             * @param _parentNode
             */
            SiteTree.prototype.populateNodeAncestorBranch = function(branch, _parentNode){
                var self = this;
                var children = _parentNode ? self.control.get_children(_parentNode) : self.data;
                // Assumes branch array is ordered top-to-bottom from 0 to n,
                // i.e. top-most ancestor ('oldest') is 0th element
                var oldestAncestor = branch[0];
                // Now check if oldest ancestor in branch exists in parent's children
                // Need to lookup nodes by id, probably bad idea to perform object comparison
                var existingNode = _.find(children, function(n){
                    return n._id === oldestAncestor._id;
                });
                if (existingNode){
                    // If we've reached the bottom of the ancestor branch and
                    // the node exists, add all origin node's children to destination's
                    // children as well
                    if (branch.length === 1){
                        oldestAncestor.__children__.forEach(function(child){
                            self.control.add_node(existingNode, child);
                        });
                    } else {
                        // pop oldest ancestor off and recurse to next-lowest level
                        branch.shift();
                        self.populateNodeAncestorBranch(branch, existingNode);
                    }
                } else {
                    // assumes oldestAncestor node already has branch seeded in its  __children__ array.
                    self.control.add_node(_parentNode, oldestAncestor);
                }
            };

            /**
             * Extension of self.control.remove_node function that removes node
             * and any empty ancestors
             *
             * @param node
             */
            SiteTree.prototype.removeNodeAndEmptyAncestors = function(node){
                var self = this;
                var parent = self.control.get_parent(node);
                self.control.remove_node(node);
                if (parent){
                    var children = self.control.get_children(parent);
                    if (children.length === 0){
                        self.removeNodeAndEmptyAncestors(parent);
                    }
                }
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
                for (var i = 0; i < self.data.length; i++) {
                    var newClique = self.data[i];
                    var oldClique = oldSiteTree.data.length > 0 ? oldSiteTree.data[i] : {};
                    if (newClique.weight != oldClique.weight) {
                        newClique.overrideChildWeights();
                    }
                    var newSites = self.control.get_children(newClique);
                    var oldSites = oldSiteTree.control.get_children(oldClique);
                    for (var k = 0; k < newSites.length; k++) {
                        var newSite = newSites[k];
                        var oldSite = oldSites ? oldSites[k] : {};
                        if (newSite.weight != oldSite.weight) {
                            newSite.overrideChildWeights();
                        }
                        var newPages = self.control.get_children(newSite);
                        var oldPages = self.control.get_children(oldSite);
                        for (var j = 0; j < newPages.length; j++) {
                            var newPage = newPages[j];
                            var oldPage = oldPages ? oldPages[j] : {};
                            if (newPage.weight != oldPage.weight) {
                                newPage.overrideChildWeights();
                            }
                        }
                    }
                }
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
             * The `SiteTree.removeNodeAndEmptyAncestors` method does exactly this,
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
            /**
             * SiteTree for All Available Sites tree vars
             */
            $scope.all_sites = new SiteTree([],
                {
                    target: function (node) {
                        // Add whole ancestor branch to new tree, as necessary
                        var branch = $scope.all_sites.getAncestorBranch(node);
                        // Now populate whole ancestor branch in target_sites
                        $scope.target_sites.populateNodeAncestorBranch(branch);
                        // Clean up all_sites tree by removing node & any empty (no children)
                        // ancestor nodes
                        $scope.all_sites.removeNodeAndEmptyAncestors(node);
                        // Set target_sites __hideSlider__ properties for nodes
                        // not present in $scope.all_sites
                        $scope.target_sites.setSliderHiders($scope.all_sites);
                        $scope.dirty = true;
                    },
                    block: function (node) {
                        // Add whole ancestor branch to new tree, as necessary
                        var branch = $scope.all_sites.getAncestorBranch(node);
                        $scope.blocked_sites.populateNodeAncestorBranch(branch);
                        $scope.all_sites.removeNodeAndEmptyAncestors(node);
                        $scope.dirty = true;
                    }
                },
                {
                    field: "name",
                    cellClass: 'v-middle',
                    displayName: 'Name'
                },
                [
                    {
                        field:        "pos",
                        displayName:  'Position',
                        cellTemplate: '<div>{{ positions(node.pos).name }}</div>'
                    },
                    {
                        field: "w",
                        displayName:  'Size',
                        cellTemplate: '<div>{{ node.w }}{{ node.w ? "x" : null }}{{ node.h }}</div>'
                    },
                    {
                        displayName:  'Actions',
                        cellTemplate: '<button type="button" class="btn btn-success btn-xs" ng-click="all_sites.control.target(node)" tooltip="Customize Bid">' +
                        '<i class="fa fa-lg fa-sliders"></i></button>  ' +
                        '<button type="button" class="btn bg-danger btn-xs" ng-click="all_sites.control.block(node)" tooltip="Add to Block List">' +
                        '<i class="fa fa-lg fa-minus-circle"></i></button>'
                    }
                ]
            );

            /**
             * Target Sites tree vars
             */
            $scope.target_sites = new SiteTree([],
                {
                    remove: function (node) {
                        // Add whole ancestor branch to new tree, as necessary
                        var branch = $scope.target_sites.getAncestorBranch(node);
                        $scope.all_sites.populateNodeAncestorBranch(branch);
                        $scope.target_sites.removeNodeAndEmptyAncestors(node);
                        $scope.dirty = true;
                    }
                },
                {
                    field: "name",
                    cellClass: 'v-middle',
                    displayName: 'Name'
                },
                [
                    {
                        field: "weight",
                        displayName: "Weight",
                        cellTemplate: '<slider ng-model="node.weight" ng-hide="node.__hideSlider__" min="0" max="Math.round(campaign.max_bid/campaign.base_bid * 10) / 10" step="0.0001" precision="4" slider-tooltip="hide" value="1.0" orientation="horizontal" class="bs-slider slider-horizontal pull-right"></slider>' +
                        '<div class="text-muted" ng-show="node.__hideSlider__ && !node.__expanded__"><small><i class="fa fa-plus-circle"></i><em>&nbsp;&nbsp;Expand to view & set bids</em></small></div>'
                    },
                    {
                        field: 'bid',
                        displayName: "Bid",
                        cellTemplate: '<span ng-hide="node.__hideSlider__">{{ Math.min(node.weight * campaign.base_bid, campaign.max_bid) | currency : "$" : 2 }}</span>'
                    },
                    {
                        displayName:  'Actions',
                        cellTemplate: '<button type="button" class="btn btn-xs" ng-click="target_sites.control.remove(node)" tooltip="Clear Bids">' +
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
                        // Add whole ancestor branch to new tree, as necessary
                        var branch = $scope.blocked_sites.getAncestorBranch(node);
                        $scope.all_sites.populateNodeAncestorBranch(branch);
                        $scope.blocked_sites.removeNodeAndEmptyAncestors(node);
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
                    cellTemplate: '<button type="button" class="btn btn-xs" ng-click="blocked_sites.control.remove(node)" tooltip="Unblock">' +
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

            /**
             * This scope watch handles overriding of child entity weights when parent is
             * changed.
             */
            $scope.$watch(function(scope){ return scope.target_sites; },function(newTargetSites, oldTargetSites) {
                if (newTargetSites && oldTargetSites){
                    newTargetSites.applyParentOverrides(oldTargetSites);
                }
            }, true);

            /**
             * Get Campaign from URL state params on load
             */
            Campaign.fromStateParams($stateParams, function(err, advertiser, campaign){
                $scope.advertiser = advertiser;
                $scope.campaign = campaign;

                // Get all available sites to this campaign, then load into $scope.all_sites
                // SiteTree instance
                getSitesInCliqueBranch($scope.campaign.clique).then(function(response){
                    $scope.all_sites.fromSitesInCliquesBranchResponse(response);
                    // Set default expand level to 0;
                    $scope.all_sites.setExpandLevel(0);
                });
            });
        }
]);