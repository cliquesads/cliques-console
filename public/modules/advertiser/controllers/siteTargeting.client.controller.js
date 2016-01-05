/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('SiteTargetingController',
    ['$scope','$stateParams','Notify','$timeout','getSitesInCliqueBranch','Campaign','flattenSiteCliques','$TreeDnDConvert','OPENRTB', 'ngDialog',
        function($scope, $stateParams, Notify, $timeout, getSitesInCliqueBranch, Campaign,flattenSiteCliques, $TreeDnDConvert, OPENRTB, ngDialog){
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
                    //this.__overridden__ = false;
                    var self = this;
                    if (self.nodeType === 'Clique' || self.nodeType === 'Site') {
                        self.__children__.forEach(function(node) {
                            //node.__lock__ = true;
                            node.weight = self.weight;
                            node.__overridden__ = true;
                            node.overrideChildWeights();
                            //node.__lock__ = false;
                        });
                    } else if (self.nodeType === 'Page'){
                        self.__children__.forEach(function(placement){
                            //node.__lock__ = true;
                            node.__overridden__ = true;
                            placement.weight    = self.weight;
                            //node.__lock__ = false;
                        });
                    }
                };
                return newNode;
            };

            //====================================================//
            //=============== BEGIN SiteTree Class ===============//
            //====================================================//

            /**
             * Wraps treeData in class containing some methods to handle commonly-used
             * logic & routines around this particular data structure.
             *
             * The model bound to the `tree-dnd` directive is stored in `this.data`. Most/all
             * methods manipulate shared this.data data model to accomplish desired actions
             * on corresponding tree-dnd object.
             *
             * Tree control handler should be bound to `this.control`.
             *
             * Wherever possible, I have used built-in tree-dnd control methods to
             * accomplish tasks like getting children, adding nodes, removing nodes, etc..
             *
             * HOWEVER, because of some hidden fuckery in the tree-dnd directive, some base control methods
             * have had to be re-written to operate properly on shared data model.  See comments in
             * this._removeNode for details.
             *
             * TODO: This class has a VERY finnicky relationship with AngularTreeDND class in
             * TODO: angular-tree-dnd directive. Needs to be refactored to either subclass AngularTreeDND
             * TODO: somehow, or make dependencies more clear
             *
             * TODO: This should be split into a base class in a service, then extended here to contain
             * TODO: Inventory-specific methods.
             *
             * @param treeData shared tree data model with tree-dnd directive.
             * @param control tree-dnd control object. Will default to base methods when bound to directive, but
             *      can pass in an object containing custom control methods.
             * @param expanding_property tree-dnd `expanding property` model
             * @param columns tree-dnd column model
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
                callback(null, null);
            };

            SiteTree.prototype.clearTreeData = function(callback){
                var self = this;
                this.data.forEach(function(topLevelNode){
                    self._removeNode(topLevelNode, null);
                });
                return callback(null)
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
             * THIS IS AN UGLY HACK. Basically paste of control.remove_node that doesn't
             * rely on control.get_parent method, which will NOT WORK before DOM is
             * fully rendered, and therefore won't work for any pre-load tree manipulation.
             */
            SiteTree.prototype._removeNode = function(node, parent){
                var self = this;
                if (node) {
                    if (parent) {
                        var _parent = parent.__children__;
                    } else {
                        _parent = self.data;
                        var clearme = true;
                    }
                    //BUG FIX, tree_nodes does not clear when last element
                    //is removed
                    if (clearme){
                        if (node.__index__ === 0){
                            self.control._clear_tree_nodes();
                        }
                    }
                    _.remove(_parent, function(n){return n._id === node._id;});
                }
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
                var parent = this.getNodeById(node.parentId);
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
             * NOTE: Had to hack this to
             *
             * @param node
             */
            SiteTree.prototype.removeNodeAndEmptyAncestors = function(node){
                var self = this;
                var parent = self.getNodeById(node.parentId);
                self._removeNode(node, parent);
                if (parent){
                    var children = parent.__children__;
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
                function inner(newSiteTree, oldSiteTree) {
                    for (var i = 0; i < newSiteTree.length; i++) {
                        var newNode = newSiteTree[i];
                        var oldNode = oldSiteTree.length > 0 ? oldSiteTree[i] : {};
                        if (newNode && oldNode){
                            if (newNode.weight != oldNode.weight) {
                                newNode.__overridden__ = false;
                                newNode.overrideChildWeights();
                            }
                            inner(newNode.__children__, oldNode.__children__)
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

            /**
             * Helper function to move node from one SiteTree instance
             * to another, according to following algorithm:
             *
             * 1) Get entire ancestor branch in origin tree
             * 2) From top to bottom, if ancestor exists in destination tree, move to its children.
             *  Else, add ancestor to new tree under its appropriate parent (recurvsively).
             * 3) Clear node from origin tree, and clear any ancestors that no longer contain
             *  any children (recursively).
             *
             * @param originTree origin SiteTree instance
             * @param destinationTree destination SiteTree instance
             * @param node node you want to move
             */
            function moveNode(originTree, destinationTree, node){
                // Add whole ancestor branch to new tree, as necessary
                var branch = originTree.getAncestorBranch(node);
                // Now populate whole ancestor branch in target_sites
                destinationTree.populateNodeAncestorBranch(branch);
                // Clean up all_sites tree by removing node & any empty (no children)
                // ancestor nodes
                originTree.removeNodeAndEmptyAncestors(node);
            }

            //==========================================================//
            //=============== BEGIN SiteTree Instances =================//
            //==========================================================//
            /**
             * SiteTree for All Available Sites tree vars
             */
            $scope.all_sites = new SiteTree([],
                {
                    target: function (node) {
                        moveNode($scope.all_sites, $scope.target_sites, node);
                        $scope.target_sites.setSliderHiders($scope.all_sites);
                        $scope.dirty = true;
                    },
                    block: function (node) {
                        node.explicit = true;
                        moveNode($scope.all_sites, $scope.blocked_sites, node);
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
                        moveNode($scope.target_sites, $scope.all_sites, node);
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
                        cellTemplate: '<rzslider rz-slider-model="node.weight" rz-slider-options="{floor: 0,ceil: Math.round(campaign.max_bid/campaign.base_bid * 10) / 10,step: 0.0001,precision: 4,id: node._id, showSelectionBar: true, onStart: onStart, hideLimitLabels: true}" ng-hide="node.__hideSlider__"></rzslider>' +
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
                        moveNode($scope.blocked_sites, $scope.all_sites, node);
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
                            // Only move nodes with weights set, others are just parent placeholders;
                            moveNode($scope.all_sites, $scope.target_sites, treeNode);
                            treeNode.weight = node.weight;
                            treeNode.__overridden__ = false;
                            treeNode.overrideChildWeights();
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
                            moveNode($scope.all_sites, $scope.blocked_sites, treeNode);
                            treeNode.explicit = true;
                        }
                        if (node.children && node.children.length > 0){
                            $scope.initializeBlockedInventoryTree(node.children, treeNode.__children__);
                        }
                    }
                });
            };

            /**
             * Wrapper to initialize all trees, starting with all sites, then moving
             * necessary nodes & branches to targets & blocked & initializing accordingly.
             */
            $scope.initializeAllTrees = function(){
                // Get all available sites to this campaign, then load into $scope.all_sites
                // SiteTree instance
                getSitesInCliqueBranch($scope.campaign.clique).then(function(response){
                    $scope.all_sites.fromSitesInCliquesBranchResponse(response, function(err, data){
                        // Set default expand level to 0;
                        $scope.all_sites.setExpandLevel(0);
                        $scope.target_sites.clearTreeData(function(err){
                            $scope.initializeTargetSiteTree($scope.campaign.inventory_targets);
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

            /**
             * Get Campaign from URL state params on load
             */
            Campaign.fromStateParams($stateParams, function(err, advertiser, campaignIndex){
                $scope.advertiser = advertiser;
                $scope.campaignIndex = campaignIndex;
                $scope.campaign = $scope.advertiser.campaigns[campaignIndex];
                $scope.initializeAllTrees();
            });
        }
]);