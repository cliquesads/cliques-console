/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('creativePreviewController', ['$scope', 'Advertiser', function($scope, Advertiser){
    $scope.advertiser = $scope.ngDialogData.advertiser;
    function setCreative(){
        var camp_index = _.findIndex($scope.advertiser.campaigns, function(campaign){
            return campaign._id === $scope.ngDialogData.campaign._id;
        });
        $scope.campaign = $scope.advertiser.campaigns[camp_index];

        var crg_index = -1;
        for (var i = 0; i < $scope.campaign.creativegroups.length; i++){
            var creativeGroup = $scope.campaign.creativegroups[i];
            var ind = _.findIndex(creativeGroup.creatives, function(cr){
                return cr.id === $scope.ngDialogData.creative.id;
            });
            if (ind > -1){
                crg_index = i;
            }
        }
        $scope.creativegroup = $scope.campaign.creativegroups[crg_index];
        var cr_index = _.findIndex($scope.creativegroup.creatives, function(creative){
            return creative.id === $scope.ngDialogData.creative.id;
        });
        $scope.creative = $scope.creativegroup.creatives[cr_index];
        $scope.src = "https://adsrvs.cliquesads.com/cr?cid=" + $scope.creative.id;
    }
    setCreative();
    $scope.update = function(){
        this.advertiser.$update(function(){
            setCreative();
            var iFrame = $("#creativePreview");
            var rand = Math.floor((Math.random()*1000000)+1);
            var src = $scope.src + "&cb=" + rand;
            iFrame.attr("src",src);
        },function(errorResponse){
            $scope.saveerror = errorResponse.data.message;
        });
    };
}]);