'use strict';

angular.module('advertiser').controller('editCreativesController', ['$scope','Advertiser','AdvertiserUtils','FileUploader',function($scope,Advertiser,AdvertiserUtils,FileUploader){
    $scope.advertiser = $scope.ngDialogData.advertiser;
    var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
        return campaign._id === $scope.ngDialogData.campaign._id;
    });
    //$scope.campaign as pointer to campaign in advertiser.campaigns array
    //this way, all Advertiser resource methods will work
    $scope.campaign = $scope.advertiser.campaigns[i];

    //#################################//
    //######### FILE UPLOADER #########//
    //#################################//

    var uploader = $scope.uploader = new FileUploader({
        url: 'creativeassets'
    });
    $scope.uploader.onCompleteAll = function(){
        $scope.uploads_completed = true;
    };
    /**
     * Wrapper for uploader.uploadAll() which allows form to pass
     * validation function to call first.
     *
     * @param validateFunc
     */
    $scope.validateAndUpload = function(validateFunc){
        // pre_callback should be validation step for other various
        // form elements, and return true if validation passes
        if (validateFunc){
            uploader.uploadAll();
        }
    };


    $scope.updateAndClose = function(){
        this.advertiser.campaigns[i] = AdvertiserUtils.convertAllTargetArrays(this.campaign);
        this.advertiser.$update(function() {
            $scope.closeThisDialog('Success');
        }, function(errorResponse){
            $scope.saveerror = errorResponse.data.message;
        });
    };
}]);
