/* globals consoleVersion, user, latestHour, deploymentMode, pricing */

angular.module('core').directive('avgPricingCurrencyFormat', [
    function(){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                clicks: '@',
                imps: '@',
                spend: '@'
            },
            template: '<span>{{ pricing === \'CPC\' ? spend / clicks : spend / imps * 1000 | currency:"$":"2" }}</span>',
            link: function(scope, element, attrs){}
        };
    }
]);