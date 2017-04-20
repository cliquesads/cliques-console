/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsSidebarController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state', 'Notify', 'Analytics',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries,
        aggregationDateRanges, ngDialog, $state, Notify, Analytics) {

        // Fetch recent queries from backend
        var i;
        Analytics.getRecentQueries()
            .success(function(data) {
                // showing only 5 recent queries at most on sidebar
                if (data.queries.length <= 5) {
                    $scope.recentQueries = data.queries;
                } else {
                    $scope.recentQueries = data.queries.slice(0, 5);
                }
                $scope.totalRecentQueries = data.total;
                // format creation datetime for each recent query
                for (i = 0; i < $scope.recentQueries.length; i ++) {
                	$scope.recentQueries[i].createdAt = Analytics.formatDatetimeString($scope.recentQueries[i].createdAt);
                }
            })
            .error(function(error) {
                Notify.alert('Error fetching recent queries: ' + error.message);
            });

        // Fetch custom queries from backend
        Analytics.getMyQueries()
            .success(function(data) {
                if (data.queries.length <= 5) {
                    $scope.customQueries = data.queries;
                } else {
                    $scope.customQueries = data.queries.slice(0, 5);
                }
            	$scope.totalCustomQueries = data.total;
            	// format creation datetime for each custom query
            	for (i = 0; i < $scope.customQueries.length; i ++) {
            		$scope.customQueries[i].createdAt = Analytics.formatDatetimeString($scope.customQueries[i].createdAt);
            	}
            })
            .error(function(error) {
                Notify.alert('Error fetching my queries: ' + error.message);
            });

		$scope.goToQuerySection = function(query) {
            if (query.type !== 'custom') {
                $state.go('app.analytics.quickQueries.' + query.type, {query: query});
            } else {
                $state.go('app.analytics.customize.result', {query: query});
            }
		};
    }
]);
