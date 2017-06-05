/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('dmaTargetsController', ['$scope','DMA', 'Advertiser','AdvertiserUtils', function($scope, DMA, Advertiser, AdvertiserUtils){
    $scope.advertiser = $scope.ngDialogData.advertiser;
    var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
        return campaign._id === $scope.ngDialogData.campaign._id;
    });
    //$scope.campaign as pointer to campaign in advertiser.campaigns array
    //this way, all Advertiser resource methods will work
    $scope.campaign = $scope.advertiser.campaigns[i];
    $scope.dmas = DMA.query(function(){
        // add weight of 1 to each target so no null weights can be set
        $scope.dmas.forEach(function(dma){
            dma.weight = 1;
        });

        // TODO: THIS IS FUCKING HORRIBLE FIX THIS
        // Have to replace dma_targets w/ options from dmas list in order to properly populate directive
        var lambda = function(dmaObj){ return dmaObj._id === target.target;};
        if ($scope.campaign.dma_targets) {
            for (var j=0; j < $scope.campaign.dma_targets.length; j++){
                var target = $scope.campaign.dma_targets[j];
                $scope.campaign.dma_targets[j] = _.find($scope.dmas, lambda);
                $scope.campaign.dma_targets[j].weight = target.weight;
                // TODO: THIS IS A HACK, otherwise overwrite dma targets when dialog is closed * opened again
                $scope.campaign.dma_targets[j].target = $scope.campaign.dma_targets[j]._id;
            }
        }

    });

    $scope.updateAndClose = function(){
        this.advertiser.campaigns[i] = AdvertiserUtils.convertAllTargetArrays(this.campaign);
        this.advertiser.$update(function() {
            $scope.closeThisDialog('Success');
        }, function(errorResponse){
            $scope.saveerror = errorResponse.data.message;
        });
    };
}]);