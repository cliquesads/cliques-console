/**
 * Created by bliang on 1/14/16.
 */
/* global _, angular */
'use strict';

angular.module('clique').controller('BrowseSitesController', ['$scope', '$stateParams', '$location',
    '$http','Authentication','Advertiser','Clique',
    'getCliqueTree','getSitesInClique','getSitesInCliqueBranch','ngDialog','openSiteDescriptionDialog',
    function($scope, $stateParams, $location, $http,Authentication,Advertiser,
             Clique, getCliqueTree, getSitesInClique, getSitesInCliqueBranch, ngDialog, openSiteDescriptionDialog) {
        $scope.authentication = Authentication;

        $scope.maxLengthForDescription = 80;
        $scope.allSites = [];

        $scope.getTextAbstract = function(text, maxLength) {
            if (!text) {
                return "";
            }
            if (text.length <= maxLength) {
                return text;
            }
            var shortText = text.substring(0, maxLength);
            var last = shortText.lastIndexOf(" ");
            shortText = shortText.substring(0, last);
            return shortText + "... Read More";
        };

        $scope.cliques = [];

        $scope.loading = true;
        $scope.find = function() {
            getCliqueTree({active: true},function(err, cliques){
                $scope.cliques = cliques;
                if ($scope.cliques.length > 0) {
                    $scope.clique = angular.copy($scope.cliques[0].clique);
                    getSitesInCliqueBranch($scope.clique._id).then(function(response) {
                        $scope.mainSites = response.data;
                        for (var i = 0; i < $scope.mainSites.length; i ++) {
                            $scope.allSites = $scope.allSites.concat($scope.mainSites[i].sites);
                        }
                        for (i = 0; i < $scope.allSites.length; i ++) {
                            $scope.allSites[i].shortDescription = $scope.getTextAbstract($scope.allSites[i].description, $scope.maxLengthForDescription);
                        }
                        $scope.loading = false;
                    });
                }
            });
        };

        $scope.getDescription = function(site) {
            openSiteDescriptionDialog(site);
        };
    }
]);