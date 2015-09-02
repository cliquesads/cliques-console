angular.module('publisher').directive('placementForm', ['CREATIVE_SIZES','OPENRTB', function(CREATIVE_SIZES, OPENRTB) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            wizardstep: '@',
            page: '='
        },
        templateUrl: 'modules/publisher/views/partials/placements-form.html',
        link: function (scope, element, attrs) {
            scope.CREATIVE_SIZES = CREATIVE_SIZES;
            scope.OPENRTB = OPENRTB;
            scope.positions_object = {};
            scope.OPENRTB.positions.forEach(function(pos){
                scope.positions_object[pos.code] = pos.name;
            });
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
                var ind = _.findIndex(scope.page.placements, function(obj){ return obj === placement});
                scope.page.placements.splice(ind, 1);
            };
        }
    }
}]);
