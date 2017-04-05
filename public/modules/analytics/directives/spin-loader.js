/**
 * Created by Chuoxian Yang on 5/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('spinLoader', [function() {
	'use strict';
	return {
		restrict: 'E',
		scope: {},
		templateUrl: 'modules/analytics/views/partials/spin-loader.html',
		link: function(scope, element, attrs) {
		}
	};	
}]);