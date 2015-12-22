/**
 * Created by bliang on 8/15/15.
 */
angular.module('aggregations').directive('customDates', ['DatepickerService',function(DatepickerService) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            startdatemodel: '=',
            enddatemodel: '=',
            wizardstep: '@',
            width: '@'
        },
        templateUrl: 'modules/aggregations/views/partials/custom-dates.html',
        link: function(scope, element, attrs){
            //TODO: FIX DATE VALIDATION HERE
            scope.calendar = DatepickerService;
        }
    };
}]);
