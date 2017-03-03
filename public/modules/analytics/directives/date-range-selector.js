/* global _, angular, user */
/**
 * Created by Chuoxian Yang on 1/3/2017
 */
angular.module('analytics').directive('dateRangeSelector', ['aggregationDateRanges', function(aggregationDateRanges) {
	'use strict';
	return {
		restrict: 'E',
		scope: {
			selectedDateRange: '='
		},
		templateUrl: 'modules/analytics/views/partials/date-range-selector.html',
		link: function(scope, element, attrs) {
			scope.dateRanges = {};
			// Ignore custom date range
			for (var key in aggregationDateRanges(user.tz)) {
				if (key !== 'custom') {
					scope.dateRanges[key] = aggregationDateRanges(user.tz)[key];
				}
			}
		}
	};
}]);