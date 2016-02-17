/**
 * Created by bliang on 2/16/16.
 */
/* global _, angular, moment, user */
'use strict';

angular.module('publisher').directive('placementBasics', ['Authentication',
    'CREATIVE_SIZES','OPENRTB',
    function(Authentication, CREATIVE_SIZES, OPENRTB) {
        'use strict';
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
                scope.OPENRTB = OPENRTB;
                scope.submitted = false;

                if (!scope.placement){
                    scope.placement = {};
                    scope.page.placements.push(scope.placement);
                }

                scope.$watch(function (scope) {
                    return scope.placement;
                }, function (newPlacement, oldPlacement) {
                    if (newPlacement) {
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
                        var dims = scope.placement.dimensions.split('x');
                        scope.placement.w = Number(dims[0]);
                        scope.placement.h = Number(dims[1]);
                        scope.publisher.$update(function(publisher) {
                            scope.onSaveSuccess(publisher);
                        }, function (errorResponse) {
                            scope.saveerror = errorResponse.message;
                            scope.onSaveError(errorResponse);
                        });
                    } else {
                        return false;
                    }
                };
            }
        }
    }
]);

