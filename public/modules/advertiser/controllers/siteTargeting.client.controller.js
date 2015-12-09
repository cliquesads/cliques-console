/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('SiteTargetingController',
    ['$scope','$stateParams','getSitesInCliqueBranch','Campaign',
        function($scope, $stateParams, getSitesInCliqueBranch, Campaign){
            Campaign.fromStateParams($stateParams, function(err, advertiser, campaign){
                $scope.advertiser = advertiser;
                $scope.campaign = campaign;

                getSitesInCliqueBranch($scope.campaign.clique).then(function(response){
                    $scope.sites = JSON.stringify(response.data, null, 2);
                });
            });

        }
]);