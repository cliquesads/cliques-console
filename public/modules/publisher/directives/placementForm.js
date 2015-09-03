angular.module('publisher').directive('placementForm', ['CREATIVE_SIZES','OPENRTB', 'ngDialog', function(CREATIVE_SIZES, OPENRTB, ngDialog) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            wizardstep: '@',
            page: '=',
            publisher: '='
        },
        templateUrl: 'modules/publisher/views/partials/placements-form.html',
        link: function (scope, element, attrs) {
            scope.CREATIVE_SIZES = CREATIVE_SIZES;
            scope.OPENRTB = OPENRTB;
            scope.positions_object = {};
            scope.OPENRTB.positions.forEach(function(pos){
                scope.positions_object[pos.code] = pos.name;
            });

            if (scope.page.placements){
                scope.page.placements.forEach(function(placement){
                    placement.dimensions = placement.w + 'x' + placement.h;
                });
            }

            /**
             * Adds new placement in placement step
             */
            scope.newPlacement = function(){
                scope.page.placements.push({
                    name: null,
                    dimensions: null,
                    h: null,
                    w: null,
                    pos: null,
                    active: true
                });
            };

            /**
             * Removes placement from array
             */
            scope.removePlacement = function(placement){
                var ind = _.findIndex(scope.page.placements, function(obj){ return obj === placement;});
                scope.page.placements.splice(ind, 1);
            };

            scope.getPlacementTag = function(placement){
                ngDialog.open({
                    template: '\
                    <section data-ng-init="getPlacementTag()">\
                        <h4>Tag for {{placement.name}}</h4>\
                        <div class="checkbox c-checkbox">\
                            <label><input type="checkbox" ng-model="options.secure"/><span class="fa fa-check"></span>Secure</label>\
                        </div>\
                        <pre>{{ tag }}</pre>\
                    </section>',
                    plain: true,
                    controller: ['$scope','PlacementTag',function($scope,PlacementTag) {
                        $scope.publisher = $scope.ngDialogData.publisher;
                        $scope.placement = $scope.ngDialogData.placement;
                        $scope.options = {
                            secure: false
                        };
                        $scope.getPlacementTag = function(){
                            PlacementTag.getTag({
                                publisherId: $scope.publisher._id,
                                placementId: $scope.placement._id,
                                secure: $scope.options.secure
                            }).then(function(response){
                                $scope.tag = response.data.tag;
                            });
                        };
                        $scope.$watch(function(scope){ return scope.options.secure; }, function(){
                            $scope.getPlacementTag();
                        });
                    }],
                    data: {publisher: scope.publisher, placement: placement}
                });
            };
        }
    }
}]);
