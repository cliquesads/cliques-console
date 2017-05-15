/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('NativeDetailsController', ['$scope','Authentication',
    'CREATIVE_SIZES','OPENRTB','NATIVE_SPECS',
    function($scope, Authentication, CREATIVE_SIZES, OPENRTB, NATIVE_SPECS) {
        $scope.authentication = Authentication;
        $scope.placement = $scope.ngDialogData.placement;
        $scope.publisher = $scope.ngDialogData.publisher;
        $scope.CREATIVE_SIZES = CREATIVE_SIZES;
        $scope.OPENRTB = OPENRTB;
        $scope.NATIVE_SPECS = NATIVE_SPECS;
        $scope.submitted = false;

        $scope.validateInput = function(name, type) {
            var input = $scope.nativeSpecsForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        $scope.save = function(){$scope.submitted = true;
            if (this.nativeSpecsForm.$valid){
                $scope.publisher.$update(function(){
                    $scope.closeThisDialog('Success');
                }, function(errorResponse){
                    $scope.saveerror = errorResponse.message;
                });
            } else {
                return false;
            }
        };
    }
]);