/**
 * Created by Chuoxian Yang on 1/3/2017
 */
angular.module('analytics').directive('timeUnitSelector', [function() {
	'use strict';
	return {
		restrict: 'E',
		scope: {
			timeUnit: '='
		},
		templateUrl: 'modules/analytics/views/partials/time-unit-selector.html',
		link: function(scope, element, attrs) {
		}
	};
}]);