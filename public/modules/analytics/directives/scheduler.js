/**
 * Created by Chuoxian Yang on 1/3/2017
 */
angular.module('analytics').directive('scheduler', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            weekday: '=',
            month: '=',
            date: '=',
            hour: '=',
            minute: '=',
            second: '='
        },
        templateUrl: 'modules/analytics/views/partials/scheduler.html',
        link: function(scope, element, attrs) {
            scope.weekdays = [
                { name: 'Mon', value: 1 },
                { name: 'Tue', value: 2 },
                { name: 'Wed', value: 3 },
                { name: 'Thu', value: 4 },
                { name: 'Fri', value: 5 },
                { name: 'Sat', value: 6 },
                { name: 'Sun', value: 7 }
            ];
            scope.months = [
                { name: 'Jan', value: 1 },
                { name: 'Feb', value: 2 },
                { name: 'Mar', value: 3 },
                { name: 'Apr', value: 4 },
                { name: 'May', value: 5 },
                { name: 'Jun', value: 6 },
                { name: 'Jul', value: 7 },
                { name: 'Aug', value: 8 },
                { name: 'Sep', value: 9 },
                { name: 'Oct', value: 10 },
                { name: 'Nov', value: 11 },
                { name: 'Dec', value: 12 }
            ];
            scope.dates = [];
            scope.selectMonth = function() {
                if (scope.month) {
                    switch (scope.month.value) {
                    	case 1:
                    	case 3:
                    	case 5:
                    	case 7:
                    	case 8:
                    	case 10:
                    	case 12:
                    		scope.dates = setDatesArray(31);
                    		break;
                    	case 4:
                    	case 6:
                    	case 9:
                    	case 11:
		                    scope.dates = setDatesArray(30);
		                    break;
                        case 2:
                            scope.dates = setDatesArray(28);
                            break;
                    }
                }
            };

            var setDatesArray = function(numberOfDays) {
                var datesArray = [];
                for (var i = 1; i <= numberOfDays; i++) {
                    datesArray.push(i);
                }
                return datesArray;
            };
        }
    };
}]);
