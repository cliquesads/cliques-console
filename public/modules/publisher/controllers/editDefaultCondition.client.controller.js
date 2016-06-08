/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('DefaultConditionController', ['$scope','Authentication','AdvertiserUtils',
    'CREATIVE_SIZES','OPENRTB','DEFAULT_TYPES','FileUploader',
    function($scope, Authentication, AdvertiserUtils, CREATIVE_SIZES, OPENRTB, DEFAULT_TYPES, FileUploader) {
        $scope.authentication = Authentication;
        $scope.placement = $scope.ngDialogData.placement;
        $scope.publisher = $scope.ngDialogData.publisher;
        $scope.CREATIVE_SIZES = CREATIVE_SIZES;
        $scope.DEFAULT_TYPES = DEFAULT_TYPES;
        $scope.OPENRTB = OPENRTB;
        $scope.submitted = false;

        $scope.$watch(function(scope){ return scope.placement; }, function(newPlacement, oldPlacement){
            if (newPlacement){
                $scope.placement.dimensions = $scope.placement.w + 'x' + $scope.placement.h;
                $scope.supportedDimensions = [$scope.placement.dimensions];
            }
        });

        $scope.validateInput = function(name, type) {
            var input = $scope.placementForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        $scope.crossValidatedefaultCondition = function(){
            switch ($scope.placement.defaultType){
                case "passback":
                    if ($scope.placementForm.passbackTag.$invalid || !$scope.placementForm.passbackTag.$modelValue){
                        return "You must provide a valid Passback Tag";
                    }
                    break;
                case "hostedCreative":
                    if ($scope.placement.hostedCreatives && $scope.placement.hostedCreatives.length > 0){
                        break;
                    } else {
                        return "You must upload at least one custom ad.";
                    }
                //TODO: add case for PSA when that functionality gets built out
            }
            return null;
        };

        $scope.save = function(){
            // set placement dimensions first
            $scope.submitted = true;
            if (this.placementForm.$valid){
                var crossValError = $scope.crossValidatedefaultCondition();
                if (crossValError){
                    $scope.saveerror = crossValError;
                    return false;
                }
                var dims = $scope.placement.dimensions.split('x');
                $scope.placement.w = Number(dims[0]);
                $scope.placement.h = Number(dims[1]);
                $scope.publisher.$update(function(){
                    $scope.closeThisDialog('Success');
                }, function(errorResponse){
                    $scope.saveerror = errorResponse.message;
                });
            } else {
                return false;
            }
        };

        //#################################//
        //######### FILE UPLOADER #########//
        //#################################//

        var uploader = $scope.uploader = new FileUploader({
            url: 'console/creativeassets'
        });
        $scope.uploader.onCompleteAll = function(){
            // When all uploads are complete, modify advertiser object for new creatives and call $update
            $scope.placement.hostedCreatives = AdvertiserUtils.getCreativesFromUploadQueue($scope.uploader);
            $scope.$apply(function(){
                $scope.publisher.$update(function(){
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

        $scope.validateQueue = function(){
            //TODO: This is pretty janky
            return $('#creativeUploadQueue').parsley().validate();
        };
    }
]);