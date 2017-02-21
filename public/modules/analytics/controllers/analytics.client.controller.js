/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog', '$state',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, 
             aggregationDateRanges, ngDialog, $state) {
        $scope.views = null;

        $scope.goToQuery = function(queryName) {
        	if (queryName === 'time') {
        		$location.path('/analytics/timeQuery');
        	}
        };
    }
]);

