/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('SiteTargetingController',
    ['$scope','$stateParams','getSitesInCliqueBranch','Campaign','flattenSiteCliques','$TreeDnDConvert','OPENRTB',
        function($scope, $stateParams, getSitesInCliqueBranch, Campaign,flattenSiteCliques, $TreeDnDConvert, OPENRTB){
            Campaign.fromStateParams($stateParams, function(err, advertiser, campaign){
                $scope.advertiser = advertiser;
                $scope.campaign = campaign;

                /**
                 * Sort of BS that the Tree DND plugin doesn't have this, so have to write silly little
                 * function just to set the initial expand level.
                 */
                function setExpandLevel(tree, level, _currentLevel){
                    _currentLevel = _currentLevel || 0;
                    tree.forEach(function(node){
                        node.__expanded__ = (_currentLevel < level);
                        if (node.__children__){
                            node.__children__ = setExpandLevel(node.__children__, level, _currentLevel + 1);
                        }
                    });
                    return tree;
                }

                /**
                 * Fucking control get_parent doesn't work properly for nested nodes,
                 * so have to write my own function to get parent
                 */
                function getActualParent(node, treeData){
                    if (node.nodeType === 'Clique'){
                        return null;
                    }
                    var parent = null;
                    for (var i=0; i < treeData.length; i++){
                        var n = treeData[i];
                        if (n._id === node.parentId){
                            parent = n;
                            break
                        } else if (n.__children__){
                            parent = getActualParent(node, n.__children__);
                            if (parent) break
                        }
                    }
                    return parent;
                }

                $scope.positions = function(posCode){
                    return _.find(OPENRTB.positions, function(pos_obj){
                        return pos_obj.code === posCode;
                    });
                };


                /**
                 * Namespace for All Available Sites tree vars
                 */
                $scope.all_sites = {
                    data: [],
                    control: {
                        target: function (node) {
                            var parent = getActualParent(node, $scope.target_sites.data);
                            $scope.target_sites.control.add_node(parent, node);
                            this.remove_node(node);
                        },
                        block: function (node) {
                            var parent = getActualParent(node, $scope.blocked_sites.data);
                            $scope.blocked_sites.control.add_node(parent, node);
                            this.remove_node(node);
                        }
                    },
                    expanding_property: {
                        field: "name",
                        cellClass: 'v-middle',
                        displayName: 'Name'
                    },
                    columns: [
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
                        }]
                };

                /**
                 * Namespace for Target Sites tree vars
                 */
                $scope.target_sites = {
                    data: [],
                    control: {
                        remove: function (node) {
                            var parent = getActualParent(node, $scope.all_sites.data);
                            $scope.all_sites.control.add_node(parent, node);
                            this.remove_node(node);
                        }
                    },
                    expanding_property: {
                        field: "name",
                        cellClass: 'v-middle',
                        displayName: 'Name'
                    },
                    columns: [
                    {
                        displayName:  'Actions',
                        cellTemplate: '<button type="button" class="btn btn-sm" ng-click="target_sites.control.remove(node)" tooltip="Remove">' +
                        '<i class="fa fa-lg fa-remove"></i></button>'
                    }]
                };

                /**
                 * Namespace for Blocked Sites tree vars
                 */
                $scope.blocked_sites = {
                    data: [],
                    control: {
                        remove: function (node) {
                            var parent = getActualParent(node, $scope.all_sites.data);
                            $scope.all_sites.control.add_node(parent, node);
                            this.remove_node(node);
                        }
                    },
                    expanding_property: {
                        field: "name",
                        cellClass: 'v-middle',
                        displayName: 'Name'
                    },
                    columns: [
                        {
                            displayName:  'Actions',
                            cellTemplate: '<button type="button" class="btn btn-sm" ng-click="blocked_sites.control.remove(node)" tooltip="Unblock">' +
                            '<i class="fa fa-lg fa-remove"></i></button>'
                        }]
                };

                getSitesInCliqueBranch($scope.campaign.clique).then(function(response){
                    var available_sites = $TreeDnDConvert.line2tree(flattenSiteCliques(response.data), '_id', 'parentId');
                    $scope.all_sites.data = setExpandLevel(available_sites,0);
                });
            });

        }
]);