/* global _, angular, moment */
'use strict';

angular.module('advertiser').controller('editCreativesController', [
    '$scope',
    'Advertiser',
    'AdvertiserUtils',
    'FileUploader',
    'ngDialog',
    function($scope, Advertiser,AdvertiserUtils,FileUploader,ngDialog){
        // Set form hidden by default
        $scope.formVisible = false;

        $scope.advertiser = $scope.ngDialogData.advertiser;
        var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
            return campaign._id === $scope.ngDialogData.campaign._id;
        });

        //$scope.campaign as pointer to campaign in advertiser.campaigns array
        //this way, all Advertiser resource methods will work
        $scope.campaign = $scope.advertiser.campaigns[i];

        $scope.update = function(){
            this.advertiser.$update(function(){
            },function(errorResponse){
                $scope.saveerror = errorResponse.data.message;
            });
        };

        //#################################//
        //######### FILE UPLOADER #########//
        //#################################//

        var uploader = $scope.uploader = new FileUploader({
            url: 'creativeassets'
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
                $scope.advertiser.$update(function(){
                    $scope.uploader.clearQueue();
                }, function(errorResponse){
                    $scope.saveerror = errorResponse.data.message;
                });
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

        $scope.remove = function(creativegroup, creative){
            ngDialog.openConfirm({
                template:'\
                            <p>Are you sure you want to delete this creative? This cannot be undone.</p>\
                            <div class="ngdialog-buttons">\
                                <button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog(0)">No</button>\
                                <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Yes</button>\
                        </div>',
                plain: true
            }).then(function(val){
                if (val === 1){
                    // first find indices of desired creative
                    var crg_ind = _.findIndex($scope.campaign.creativegroups, function(crg) { return crg === creativegroup; });
                    var cr_ind = _.findIndex($scope.campaign.creativegroups[crg_ind].creatives, function(cr) { return cr === creative; });
                    // remove from creatives document array
                    $scope.campaign.creativegroups[crg_ind].creatives.splice(cr_ind, 1);
                    //remove creative group if it doesn't contain any creatives anymore
                    if ($scope.campaign.creativegroups[crg_ind].creatives.length === 0){
                        $scope.campaign.creativegroups.splice(crg_ind, 1);
                    }
                    $scope.update();
                }
            });
        };

        $scope.validateQueue = function(){
            //TODO: This is pretty janky
            return $('#creativeUploadQueue').parsley().validate();
        };

        $scope.updateAndClose = function(){
            this.advertiser.$update(function() {
                $scope.closeThisDialog('Success');
            }, function(errorResponse){
                $scope.saveerror = errorResponse.data.message;
            });
        };
}]);
