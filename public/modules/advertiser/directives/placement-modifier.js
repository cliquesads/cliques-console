
angular.module('advertiser').directive('placementModifier', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            sites: '=',
            campaign: '='
        },
        templateUrl: 'modules/advertiser/views/partials/placement-modifier.html',
        link: function(scope, element, attrs){
            scope.Math = Math;
            scope.base_bid = 10;
            scope.max_bid = 20;
            //var targets = scope.targets = [];
            //scope.changeHandler = function(node){
            //    if (node.selected){
            //        if (targets.indexOf(node) === -1){
            //            targets.push(node);
            //        }
            //    } else {
            //        if (targets.indexOf(node) > -1){
            //            targets.splice(targets.indexOf(node), 1)
            //        }
            //    }
            //};
        }
    };
}]);