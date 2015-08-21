angular.module('advertiser').controller('dmaTargetsController', ['$scope','DMA', 'Advertiser','AdvertiserUtils', function($scope, DMA, Advertiser, AdvertiserUtils){
    $scope.advertiser = $scope.ngDialogData.advertiser;
    var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
        return campaign._id === $scope.ngDialogData.campaign._id;
    });
    //$scope.campaign as pointer to campaign in advertiser.campaigns array
    //this way, all Advertiser resource methods will work
    $scope.campaign = $scope.advertiser.campaigns[i];
    $scope.dmas = DMA.query(function(){
        // TODO: THIS IS FUCKING HORRIBLE FIX THIS
        // Have to replace dma_targets w/ options from dmas list in order to properly populate directive
        for (var j=0; j < $scope.campaign.dma_targets.length; j++){
            var target = $scope.campaign.dma_targets[j];
            $scope.campaign.dma_targets[j] = _.find($scope.dmas, function(dmaObj){ return dmaObj._id === target.target;});
            $scope.campaign.dma_targets[j].weight = target.weight;
            // TODO: THIS IS A HACK, otherwise overwrite dma targets when dialog is closed * opened again
            $scope.campaign.dma_targets[j].target = $scope.campaign.dma_targets[j]._id;
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
