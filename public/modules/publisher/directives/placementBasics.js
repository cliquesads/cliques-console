/**
 * Created by bliang on 2/16/16.
 */
/* global _, angular, moment, user */
'use strict';

angular.module('publisher').directive('placementBasics', ['Authentication',
    'CREATIVE_SIZES','OPENRTB','PLACEMENT_TYPES','NATIVE_POSITIONS','ngDialog',
    function(Authentication, CREATIVE_SIZES, OPENRTB, PLACEMENT_TYPES, NATIVE_POSITIONS, ngDialog) {
        return {
            restrict: 'E',
            scope: {
                page: '=',
                publisher: '=',
                placement: '=?',
                onSaveSuccess: '&',
                onSaveError: '&'
            },
            templateUrl: 'modules/publisher/views/partials/edit-placement-basics.html',
            link: function (scope, element, attrs) {
                scope.authentication = Authentication;
                scope.CREATIVE_SIZES = CREATIVE_SIZES;
                scope.PLACEMENT_TYPES = PLACEMENT_TYPES;
                scope.NATIVE_POSITIONS = NATIVE_POSITIONS;
                scope.OPENRTB = OPENRTB;
                scope.submitted = false;

                scope.openTypeDialog = function(){
                    ngDialog.open({
                        template: 'modules/publisher/views/partials/placement-types-help.html',
                        controller: ['$scope','PLACEMENT_TYPES',function($scope,PLACEMENT_TYPES) {
                            $scope.PLACEMENT_TYPES = PLACEMENT_TYPES;
                        }]
                    });
                };

                scope.$watch(function (scope) {
                    return scope.placement;
                }, function (newPlacement, oldPlacement) {
                    if (newPlacement && newPlacement.type === 'display') {
                        scope.placement.dimensions = scope.placement.w + 'x' + scope.placement.h;
                        scope.supportedDimensions = [scope.placement.dimensions];
                    }
                });

                scope.validateInput = function (name, type) {
                    var input = scope.placementForm[name];
                    return (input.$dirty || scope.submitted) && input.$error[type];
                };

                scope.save = function () {
                    // set placement dimensions first
                    scope.submitted = true;
                    if (this.placementForm.$valid) {
                        if (scope.placement.type === 'display' || !scope.placement.type){
                            var dims = scope.placement.dimensions.split('x');
                            scope.placement.w = Number(dims[0]);
                            scope.placement.h = Number(dims[1]);
                        } else {
                            scope.placement.defaultType = 'hide';
                            scope.placement.native = {};
                            scope.placement.w = 1;
                            scope.placement.h = 1;
                        }
                        scope.publisher.$update(function(publisher) {
                            scope.onSaveSuccess(publisher);
                        }, function (errorResponse) {
                            scope.onSaveError(errorResponse);
                            scope.$apply(function(){
                                scope.saveerror = errorResponse.message;
                            });
                        });
                    } else {
                        return false;
                    }
                };
            }
        };
    }
]);

