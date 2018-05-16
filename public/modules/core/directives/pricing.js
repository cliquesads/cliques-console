/* globals consoleVersion, user, latestHour, deploymentMode, pricing */

angular.module('core').directive('avgPricingCurrencyFormat', [
    function(){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                rowModel: '=',
                clicksModel: '=',
                impsModel: '=',
                spendModel: '='
            },
            template: '<span>{{ pricing === \'CPC\' ? spend / clicks : spend / imps * 1000 | currency:"$":"2" }}</span>',
            link: function(scope, element, attrs){
                if (scope.rowModel){
                    scope.spend = scope.rowModel.spend;
                    scope.clicks = scope.rowModel.clicks;
                    scope.imps = scope.rowModel.imps;
                } else {
                    scope.spend = scope.spendModel;
                    scope.clicks = scope.clicksModel;
                    scope.imps = scope.impsModel;
                }
            }
        };
    }
]);

