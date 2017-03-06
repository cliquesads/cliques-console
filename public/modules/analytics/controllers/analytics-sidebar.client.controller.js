/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsSidebarController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state', 'Notify', 'Analytics',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries,
        aggregationDateRanges, ngDialog, $state, Notify, Analytics) {
        $scope.views = null;

        // Fetch recent queries from backend
        Analytics.getRecentQueries()
            .success(function(data) {
                $scope.recentQueries = data.queries;
                $scope.totalRecentQueries = data.total;
                // format creation datetime for each recent query
                for (var i = 0; i < $scope.recentQueries.length; i ++) {
                	$scope.recentQueries[i].createdAt = Analytics.formatDatetimeString($scope.recentQueries[i].createdAt);
                }
            })
            .error(function(error) {
                Notify.alert('Error fetching recent queries: ' + error.message);
            });

        // Fetch custom queries from backend
        Analytics.getMyQueries()
            .success(function(data) {
            	$scope.customQueries = data.queries;
            	$scope.totalCustomQueries = data.total;
            	// format creation datetime for each custom query
            	for (var i = 0; i < $scope.customQueries.length; i ++) {
            		$scope.customQueries[i].createdAt = Analytics.formatDatetimeString($scope.customQueries[i].createdAt);
            	}
            })
            .error(function(error) {
                Notify.alert('Error fetching my queries: ' + error.message);
            });

		$scope.goToQuerySection = function(query) {
			switch (query.name) {
				case 'Time':
					$state.go('app.analytics.timeQuery', {query: query});
					break;
				case 'Sites':
					$state.go('app.analytics.sitesQuery', {query: query});
			}
		};
    }
]);
