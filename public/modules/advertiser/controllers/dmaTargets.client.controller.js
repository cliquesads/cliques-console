angular.module('advertiser').controller('dmaTargetsController', ['$scope','DMA', 'Advertiser','AdvertiserUtils', function($scope, DMA, Advertiser, AdvertiserUtils){
    $scope.advertiser = $scope.ngDialogData.advertiser;
    var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
        return campaign._id === $scope.ngDialogData.campaign._id;
    });
    //$scope.campaign as pointer to campaign in advertiser.campaigns array
    //this way, all Advertiser resource methods will work
    $scope.campaign = $scope.advertiser.campaigns[i];
    $scope.dmas = DMA.query(function(){
        // Augment DMA targeting data w/ names as well
        $scope.campaign.dma_targets.forEach(function(target){
            target.name = _.find($scope.dmas, function(dmaObj){ return dmaObj._id === target.target;}).name;
        });
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
