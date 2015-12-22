/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('SiteTargetingController',
    ['$scope','$stateParams','getSitesInCliqueBranch','Campaign','flattenSiteCliques','$TreeDnDConvert','OPENRTB',
        function($scope, $stateParams, getSitesInCliqueBranch, Campaign,flattenSiteCliques, $TreeDnDConvert, OPENRTB){
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
            SiteTree.prototype.loadResponseData = function(response){
                var sitesInCliqueBranch = response.data;
                var flattened = [];
                sitesInCliqueBranch.forEach(function(clique){
                    var c = _.clone(clique);
                    c.nodeType = 'Clique';
                    delete c.sites;
                    c.parentId = null;
                    flattened.push(c);
                    clique.sites.forEach(function(site){
                        var s = _.clone(site);
                        s.nodeType = 'Site';
                        delete s.pages;
                        s.parentId = clique._id;
                        flattened.push(s);
                        site.pages.forEach(function(page){
                            var p = _.clone(page);
                            p.nodeType = 'Page';
                            delete p.placements;
                            p.parentId = site._id;
                            flattened.push(p);
                            page.placements.forEach(function(placement){
                                var pl = _.clone(placement);
                                pl.nodeType = 'Placement';
                                pl.parentId = page._id;
                                flattened.push(pl);
                            });
                        });
                    });
                });
                this.data = $TreeDnDConvert.line2tree(flattened, '_id', 'parentId');
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
                    return this.getAncestorBranch(parent, _ancestors);
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

            $scope.positions = function(posCode){
                return _.find(OPENRTB.positions, function(pos_obj){
                    return pos_obj.code === posCode;
                });
            };

            Campaign.fromStateParams($stateParams, function(err, advertiser, campaign){
                $scope.advertiser = advertiser;
                $scope.campaign = campaign;

                /**
                 * Namespace for All Available Sites tree vars
                 */
                $scope.all_sites = new SiteTree([],
                     {
                        target: function (node) {
                            // Add whole ancestor branch to new tree, as necessary
                            var branch = $scope.all_sites.getAncestorBranch(node);
                            $scope.target_sites.populateNodeAncestorBranch(branch);
                            this.remove_node(node);
                        },
                        block: function (node) {
                            // Add whole ancestor branch to new tree, as necessary
                            var branch = $scope.all_sites.getAncestorBranch(node);
                            $scope.blocked_sites.populateNodeAncestorBranch(branch);
                            this.remove_node(node);
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
                            cellTemplate: '<button type="button" class="btn btn-success btn-sm" ng-click="all_sites.control.target(node)" tooltip="Add to Targets">' +
                            '<i class="fa fa-lg fa-check-circle"></i></button>  ' +
                            '<button type="button" class="btn btn-danger btn-sm" ng-click="all_sites.control.block(node)" tooltip="Add to Block List">' +
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
                            this.remove_node(node);
                        }
                    },
                    {
                        field: "name",
                        cellClass: 'v-middle',
                        displayName: 'Name'
                    },
                    [{
                        displayName:  'Actions',
                        cellTemplate: '<button type="button" class="btn btn-sm" ng-click="target_sites.control.remove(node)" tooltip="Remove">' +
                        '<i class="fa fa-lg fa-remove"></i></button>'
                    }]
                );

                /**
                 * Namespace for Blocked Sites tree vars
                 */
                $scope.blocked_sites = new SiteTree([],
                    {
                        remove: function (node) {
                            // Add whole ancestor branch to new tree, as necessary
                            var branch = $scope.blocked_sites.getAncestorBranch(node);
                            $scope.all_sites.populateNodeAncestorBranch(branch);
                            this.remove_node(node);
                        }
                    },
                    {
                        field: "name",
                        cellClass: 'v-middle',
                        displayName: 'Name'
                    },
                    [{
                        displayName:  'Actions',
                        cellTemplate: '<button type="button" class="btn btn-sm" ng-click="blocked_sites.control.remove(node)" tooltip="Unblock">' +
                        '<i class="fa fa-lg fa-remove"></i></button>'
                    }]
                );

                getSitesInCliqueBranch($scope.campaign.clique).then(function(response){
                    $scope.all_sites.loadResponseData(response);
                    $scope.all_sites.setExpandLevel(1);
                });
            });
        }
]);