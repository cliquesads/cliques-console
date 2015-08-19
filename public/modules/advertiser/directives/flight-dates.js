/**
 * Created by bliang on 8/15/15.
 */
angular.module('advertiser').directive('flightDates', ['DatepickerService',function(DatepickerService) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            startdatemodel: '=',
            enddatemodel: '=',
            wizardstep: '@',
            width: '@'
        },
        templateUrl: 'modules/advertiser/views/partials/flight-dates.html',
        link: function(scope, element, attrs){
            //TODO: FIX DATE VALIDATION HERE
            scope.calendar = DatepickerService;
        }
    };
}]);
