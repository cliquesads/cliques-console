/* global _, angular, moment */
'use strict';

angular.module('advertiser').controller('uploadCreativesController', [
    '$scope',
    'AdvertiserUtils',
    'FileUploader',
    'ngDialog',
    'Notify',
    'NATIVE_SPECS',
    function($scope,AdvertiserUtils,FileUploader,ngDialog, Notify, NATIVE_SPECS){

        $scope.advertiser = $scope.ngDialogData.advertiser;

        // Set refs to nested documents in parent Advertiser so $update method
        // can be used.  Don't know if this is entirely necessary but doing
        // to be safe, as I find Angular's handling of object refs kind of confusing
        function setCampaign(){
            var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
                return campaign._id === $scope.ngDialogData.campaign._id;
            });
            //$scope.campaign as pointer to campaign in advertiser.campaigns array
            //this way, all Advertiser resource methods will work
            $scope.campaign = $scope.advertiser.campaigns[i];
        }
        setCampaign();

        // almost trivial wrapper for scope.advertiser.$update that just ensures campaign
        // is reset properly in scope when advertiser is updated, and sets scope.saveerror if error
        // is thrown.
        $scope.update = function(success, error){
            this.advertiser.$update(function(response){
                $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                if (success) success(response);
            },function(errorResponse){
                if (error) error(errorResponse);
                $scope.saveerror = errorResponse.data.message;
            });
        };

        // Function to pass to DoubleClick creative uploader
        $scope.onDCMUpload = function(creatives){
            var creativeGroups = AdvertiserUtils.groupCreatives(creatives, $scope.campaign.name);
            AdvertiserUtils.updateCreativeGroups(creativeGroups, $scope.campaign);
            $scope.update(function(response){
                Notify.alert('Success! Your doubleClick creative was added to your campaign.', {status: 'success'});
            }, function(errorResponse){
                Notify.alert('Oops, something went wrong: ' + errorResponse.data.message, {status: 'danger'});
            });
        };

        //#########################################//
        //######### DISPLAY FILE UPLOADER #########//
        //#########################################//

        var uploader = $scope.uploader = new FileUploader({
            url: 'console/creativeassets'
        });

        $scope.uploader.onCompleteAll = function(){
            // When all uploads are complete, modify advertiser object for new creatives and call $update
            var creatives = AdvertiserUtils.getCreativesFromUploadQueue($scope.uploader);
            var creativegroups = AdvertiserUtils.groupCreatives(creatives, $scope.campaign.name);
            // have to merge new creativeGroups with any existing first
            $scope.$apply(function() {
                creativegroups.forEach(function (crg) {
                    var ind = _.findIndex($scope.campaign.creativegroups, function (cg) {
                        return cg.w === crg.w && cg.h === crg.h;
                    });
                    // if creativegroup of same size exists, add to this creative group
                    if (ind > -1) {
                        $scope.campaign.creativegroups[ind].creatives = $scope.campaign.creativegroups[ind].creatives.concat(crg.creatives);
                    } else {
                        $scope.campaign.creativegroups.push(crg);
                    }
                });
                $scope.update(function(){
                    $scope.uploader.clearQueue();
                }, function(errorResponse){});
            });
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

        $scope.validateQueue = function(){
            //TODO: This is pretty janky
            return $('#creativeUploadQueue').parsley().validate();
        };

        //########################################//
        //######### NATIVE FILE UPLOADER #########//
        //########################################//

        var nativeUploader = $scope.nativeUploader = new FileUploader({
            url: 'console/native-images'
        });
        $scope.nativeUploader.onCompleteAll = function(){
            // When all uploads are complete, modify advertiser object for new creatives and call $update
            var creatives = AdvertiserUtils.getCreativesFromNativeUploadQueue($scope.nativeUploader, $scope.advertiser);
            var creativegroups = AdvertiserUtils.groupCreatives(creatives, $scope.campaign.name);
            // have to merge new creativeGroups with any existing first
            $scope.$apply(function() {
                creativegroups.forEach(function (crg) {
                    var ind = _.findIndex($scope.campaign.creativegroups, function (cg) {
                        if (crg.type === 'native'){
                            return cg.type === 'native';
                        } else {
                            return cg.w === crg.w && cg.h === crg.h;
                        }
                    });
                    // if creativegroup of same size exists, add to this creative group
                    if (ind > -1) {
                        $scope.campaign.creativegroups[ind].creatives = $scope.campaign.creativegroups[ind].creatives.concat(crg.creatives);
                    } else {
                        $scope.campaign.creativegroups.push(crg);
                    }
                });
                $scope.update(function(){
                    $scope.nativeUploader.clearQueue();
                }, function(errorResponse){});
            });
        };

        //########################################//
        //######### NATIVE FILE UPLOADER #########//
        //########################################//

        var nativeBulkUploader = $scope.nativeBulkUploader = new FileUploader({});

        $scope.nativeUploader.onCompleteAll = function(){};

        /**
         * Wrapper for uploader.uploadAll() which allows form to pass
         * validation function to call first.
         *
         * @param validateFunc
         */
        $scope.nativeValidateAndUpload = function(validateFunc){
            // pre_callback should be validation step for other various
            // form elements, and return true if validation passes
            if (validateFunc){
                nativeUploader.uploadAll();
            }
        };

        $scope.validateNativeQueue = function(){
            //TODO: This is pretty janky
            return $('#nativeCreativeUploadQueue').parsley().validate();
        };

        $scope.updateAndClose = function(){
            $scope.update(function(){
                $scope.closeThisDialog('Success');
            }, function(errorResponse){});
        };
    }]);