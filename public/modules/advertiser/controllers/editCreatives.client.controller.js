'use strict';

angular.module('advertiser').controller('editCreativesController', [
    '$scope',
    'editableOptions',
    'editableThemes',
    'Advertiser',
    'AdvertiserUtils',
    'FileUploader',
    'ngDialog',
    function($scope,editableOptions, editableThemes, Advertiser,AdvertiserUtils,FileUploader,ngDialog){
        editableOptions.theme = 'bs3';
        editableThemes.bs3.inputClass = 'input-sm';
        editableThemes.bs3.buttonsClass = 'btn-sm';
        editableThemes.bs3.submitTpl = '<button type="button" ng-click="$form.$submit()" class="btn btn-success"><span class="fa fa-check"></span></button>';
        editableThemes.bs3.cancelTpl = '<button type="button" class="btn btn-default" ng-click="$form.$cancel()">'+
                                        '<span class="fa fa-times text-muted"></span>'+
                                        '</button>';

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
                        return cg.w === crg.w && cg.h === crg.h
                    });
                    // if creativegroup of same size exists, add to this creative group
                    if (ind > -1) {
                        $scope.campaign.creativegroups[ind] = _.union($scope.campaign.creativegroups[ind], crg);
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

        // Add remove() method to each creative
        $scope.$watch(function(scope){ return scope.campaign }, function(){
            $scope.campaign.creativegroups.forEach(function(creativegroup){
                creativegroup.creatives.forEach(function(creative){
                    // remove function
                    creative.remove = function(){
                        ngDialog.openConfirm({
                            template:'\
                            <p>Are you sure you want to delete this creative? This cannot be undone.</p>\
                            <div class="ngdialog-buttons">\
                                <button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog(0)">No</button>\
                                <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Yes</button>\
                        </div>',
                            plain: true
                        }).then(function(val){
                            var ind = creativegroup.creatives.indexOf(creative);
                            creativegroup.creatives.splice(ind,1);
                            if (creativegroup.creatives.length === 0){
                                var crgind = $scope.campaign.creativegroups.indexOf(creativegroup);
                                $scope.campaign.creativegroups.splice(crgind,1);
                                $scope.update();
                            }
                        });
                    }
                });
            });
        });


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
