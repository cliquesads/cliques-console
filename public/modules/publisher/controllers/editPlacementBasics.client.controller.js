/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('PlacementBasicsController', ['$scope','Authentication',
    'CREATIVE_SIZES','OPENRTB',
    function($scope, Authentication, CREATIVE_SIZES, OPENRTB) {
        $scope.authentication = Authentication;
        $scope.placement = $scope.ngDialogData.placement;
        $scope.publisher = $scope.ngDialogData.publisher;
        $scope.CREATIVE_SIZES = CREATIVE_SIZES;
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

        $scope.save = function(){
            // set placement dimensions first
            $scope.submitted = true;
            if (this.placementForm.$valid){
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
    }
]);

