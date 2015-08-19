angular.module('advertiser').controller('dmaTargetsController', ['$scope','DMA', 'Advertiser','AdvertiserUtils', function($scope, DMA, Advertiser, AdvertiserUtils){
    $scope.advertiser = $scope.ngDialogData.advertiser;
    var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
        return campaign._id === $scope.ngDialogData.campaign._id;
    });
    //$scope.campaign as pointer to campaign in advertiser.campaigns array
    //this way, all Advertiser resource methods will work
    $scope.campaign = $scope.advertiser.campaigns[i];
    $scope.dmas = DMA.query(function(){
        // Have to replace dma_targets w/ options from dmas list in order to properly populate directive
        for (var i=0; i < $scope.campaign.dma_targets.length; i++){
            var target = $scope.campaign.dma_targets[i];
            $scope.campaign.dma_targets[i] = _.find($scope.dmas, function(dmaObj){ return dmaObj._id === target.target;});
            $scope.campaign.dma_targets[i].weight = target.weight;
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
