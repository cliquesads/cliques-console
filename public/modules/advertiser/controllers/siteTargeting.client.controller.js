/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('SiteTargetingController',
    ['$scope','$stateParams','getSitesInCliqueBranch','Campaign','$TreeDnDConvert',
        function($scope, $stateParams, getSitesInCliqueBranch, Campaign,$TreeDnDConvert){
            Campaign.fromStateParams($stateParams, function(err, advertiser, campaign){
                $scope.advertiser = advertiser;
                $scope.campaign = campaign;

                getSitesInCliqueBranch($scope.campaign.clique).then(function(response){
                    $scope.sites = JSON.stringify(response.data, null, 2);

                    console.log($scope.sites);
                });

                // Begin Tree DND controller objects & functions
                var tree;
                $scope.tree_data = {};
                $scope.my_tree = tree = {};

                $scope.my_tree.addFunction = function (node) {
                    console.log(node);
                    alert('Function added in Controller "App.js"');
                };

                $scope.expanding_property = {
                    /*template: "<td>OK All</td>",*/
                    field:       "Name",
                    titleClass:  'text-center',
                    cellClass:   'v-middle',
                    displayName: 'Name'
                };
                $scope.col_defs = [
                    {
                        field: "Description"
                    }, {
                        field:        "Description",
                        titleStyle:   {
                            'width': '80pt'
                        },
                        titleClass:   'text-center',
                        cellClass:    'v-middle text-center',
                        displayName:  'Description',
                        cellTemplate: "<i class=\"fa {{ !node.Description ? 'fa-times text-danger-lter' : 'fa-check text-success' }} text\"></i>"
                    }, {
                        displayName:  'Function',
                        cellTemplate: '<button ng-click="tree.addFunction(node)" class="btn btn-default btn-sm">Added Controller!</button>'
                    }, {
                        displayName:  'Remove',
                        cellTemplate: '<button ng-click="tree.remove_node(node)" class="btn btn-default btn-sm">Remove</button>'
                    }];
            });

        }
]);