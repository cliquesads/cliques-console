/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('editPlacementController', ['$scope','Authentication','CREATIVE_SIZES','OPENRTB','DEFAULT_TYPES',
    function($scope, Authentication, CREATIVE_SIZES, OPENRTB, DEFAULT_TYPES) {
        $scope.authentication = Authentication;
        $scope.placement = $scope.ngDialogData.placement;
        $scope.publisher = $scope.ngDialogData.publisher;
        $scope.CREATIVE_SIZES = CREATIVE_SIZES;
        $scope.DEFAULT_TYPES = DEFAULT_TYPES;
        $scope.OPENRTB = OPENRTB;

        $scope.$watch(function(scope){ return scope.placement; }, function(newPlacement, oldPlacement){
            if (newPlacement){
                $scope.placement.dimensions = $scope.placement.w + 'x' + $scope.placement.h;
            }
        });

        $scope.save = function(){
            // set placement dimensions first
            var dims = $scope.placement.dimensions.split('x');
            $scope.placement.w = Number(dims[0]);
            $scope.placement.h = Number(dims[1]);
            $scope.publisher.$update(function(){
                $scope.closeThisDialog('Success');
            }, function(errorResponse){
                $scope.saveerror = errorResponse.message;
            });
        };
    }
]);

