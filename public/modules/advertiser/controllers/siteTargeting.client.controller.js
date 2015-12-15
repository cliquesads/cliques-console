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
                        addFunction: function (node) {
                            console.log(node);
                            alert('Function added in Controller "App.js"');
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
                        }]
                };

                /**
                 * Namespace for Target Sites tree vars
                 */
                $scope.target_sites = {
                    data: [],
                    control: {
                        addFunction: function (node) {
                            console.log(node);
                            alert('Function added in Controller "App.js"');
                        }
                    },
                    expanding_property: {
                        field: "name",
                        titleClass: 'text-center',
                        cellClass: 'v-middle',
                        displayName: 'Name'
                    },
                    columns: [
                        {
                            displayName: 'Logo',
                            cellTemplate: '<img src="{{ node.logo_secure_url }}" class="client-logo-xs"/>'
                        },
                        {
                            field:        "Description",
                            titleStyle:   {
                                'width': '80pt'
                            },
                            titleClass:   'text-center',
                            cellClass:    'v-middle text-center',
                            displayName:  'Description'
                        },
                        {
                            displayName:  'Function',
                            cellTemplate: '<button ng-click="tree.addFunction(node)" class="btn btn-default btn-sm">Added Controller!</button>'
                        }]
                };

                /**
                 * Namespace for Blocked Sites tree vars
                 */
                $scope.blocked_sites = {
                    data: [],
                    control: {
                        addFunction: function (node) {
                            console.log(node);
                            alert('Function added in Controller "App.js"');
                        }
                    },
                    expanding_property: {
                        field: "name",
                        titleClass: 'text-center',
                        cellClass: 'v-middle',
                        displayName: 'Name'
                    },
                    columns: [
                        {
                            displayName: 'Logo',
                            cellTemplate: '<img src="{{ node.logo_secure_url }}" class="client-logo-xs"/>'
                        },
                        {
                            field:        "Description",
                            titleStyle:   {
                                'width': '80pt'
                            },
                            titleClass:   'text-center',
                            cellClass:    'v-middle text-center',
                            displayName:  'Description',
                            cellTemplate: "<i class=\"fa {{ !node.description ? 'fa-times text-danger-lter' : 'fa-check text-success' }} text\"></i>"
                        },
                        {
                            displayName:  'Function',
                            cellTemplate: '<button ng-click="tree.addFunction(node)" class="btn btn-default btn-sm">Added Controller!</button>'
                        }]
                };

                getSitesInCliqueBranch($scope.campaign.clique).then(function(response){
                    var available_sites = $TreeDnDConvert.line2tree(flattenSiteCliques(response.data), '_id', 'parentId');
                    $scope.all_sites.data = setExpandLevel(available_sites,0);
                });
            });

        }
]);