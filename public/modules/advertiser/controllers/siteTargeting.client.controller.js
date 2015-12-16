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

            SiteTree.prototype.getAncestorBranch = function(node, _ancestors){
                _ancestors = _ancestors || [];
                var parent = this.control.get_parent(node);
                if (parent) {
                    _ancestors.unshift(parent);
                    return this.getAncestorBranch(parent, _ancestors);
                } else {
                    return _ancestors;
                }
            };

            /**
             * Adds node & all ancestor nodes that don't already exist to this siteTree.
             * Assumes that all necessary ancestor nodes are present in origin tree.
             */
            SiteTree.addNodeAndAncestors = function(node, originSiteTree, destinationSiteTree){
                var ancestors = originSiteTree.getAncestorBranch(node);
                var k;
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
                            var parent = $scope.target_sites.getNodeById(node.parentId);
                            SiteTree.addNodeAndAncestors(node, $scope.all_sites, $scope.target_sites);
                            $scope.target_sites.control.add_node(parent, node);
                            this.remove_node(node);
                        },
                        block: function (node) {
                            var parent = $scope.blocked_sites.getNodeById(node.parentId);
                            $scope.blocked_sites.control.add_node(parent, node);
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
                            var parent = $scope.all_sites.getNodeById(node.parentId);
                            $scope.all_sites.control.add_node(parent, node);
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
                            var parent = $scope.all_sites.getNodeById(node.parentId);
                            $scope.all_sites.control.add_node(parent, node);
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