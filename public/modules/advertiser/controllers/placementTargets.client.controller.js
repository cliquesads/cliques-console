/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('placementTargetsController', ['$scope','getSitesInCliqueTree', 'Advertiser', function($scope, getSitesInCliqueTree, Advertiser){
    $scope.advertiser = $scope.ngDialogData.advertiser;
    var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
        return campaign._id === $scope.ngDialogData.campaign._id;
    });

    //$scope.campaign as pointer to campaign in advertiser.campaigns array
    //this way, all Advertiser resource methods will work
    $scope.campaign = $scope.advertiser.campaigns[i];

    getSitesInCliqueTree($scope.campaign.clique).then(function(response){
        $scope.sites = response.data;
    });

    $scope.updateAndClose = function(){
        this.advertiser.campaigns[i] = this.campaign;
        this.advertiser.$update(function() {
            $scope.closeThisDialog('Success');
        }, function(errorResponse){
            $scope.saveerror = errorResponse.data.message;
        });
    };
}]);