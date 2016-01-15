/**
 * Created by bliang on 1/14/16.
 */
/* global _, angular */
'use strict';

angular.module('clique').controller('BrowseSitesController', ['$scope', '$stateParams', '$location',
    '$http','Authentication','Advertiser','Clique',
    'getCliqueTree','getSitesInClique','getSitesInCliqueBranch','ngDialog',
    function($scope, $stateParams, $location, $http,Authentication,Advertiser,
             Clique, getCliqueTree) {
        $scope.authentication = Authentication;

        // This is our API control variable
        var tree;
        $scope.my_tree = tree = {};

        // Populate tree data for tree visualization
        $scope.cliques = [];
        $scope.find = function() {
            getCliqueTree({active: true},function(err, cliques){
                $scope.cliques = cliques;
            });
        };

        $scope.set_clique = function(branch) {
            $scope.clique = angular.copy(branch.clique);
        };
    }
]);