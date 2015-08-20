/**
 * Created by bliang on 8/15/15.
 */
angular.module('advertiser').directive('bidModifier', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            title: '@',
            targets: '=',
            options: '=',
            campaign: '=',
            wizardstep: '@',
            width: '@'
        },
        templateUrl: 'modules/advertiser/views/partials/bid-modifier.html',
        link: function(scope, element, attrs){
            scope.div_id = scope.title.toLowerCase();
            scope.Math = Math;
        }
    };
}]);