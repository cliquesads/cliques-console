/**
 * Created by bliang on 8/6/15.
 */

/* global _, angular */
'use strict';

angular.module('core').directive("radial", function(){
    return {
        restrict: 'E',
        scope: {
            percent: '=',
            size: '@',
            tooltipText: '@'
        },
        template: '<div tooltip="{{ tooltipText }}" data-label="{{ percentformatted }}" class="radial-bar {{ radialpercentclass }} radial-bar-{{ size }}"></div>',
        link: function(scope, element, attrs){
            scope.radialpercentclass = 'radial-bar-0';
            scope.percentformatted = '0%';
            scope.$watch(function(scope){ return scope.percent; }, function(newVal, oldVal){
                if (newVal){
                    var percentage = Number(newVal * 100).toFixed(0);
                    var rounded = 5 * Math.round(percentage/5);
                    scope.radialpercentclass = 'radial-bar-' + rounded;
                    scope.percentformatted = percentage + '%';
                }
            });
        }
    };
});