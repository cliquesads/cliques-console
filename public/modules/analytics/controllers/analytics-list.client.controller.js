/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsListController', ['$scope', 'Analytics', 'Notify', '$state', '$window', 'QUERY_ROUTES',
	function($scope, Analytics, Notify, $state, $window, QUERY_ROUTES) {
		$scope.queries = [];
		$scope.total = 0;
		$scope.currentPage = 1;
		$scope.isLoading = false;
		$scope.hasMore = false;
		$scope.queryRoutes = QUERY_ROUTES;

		// Make query results human readable
		$scope.handleQueryResults = function(queries) {
			for (var i = 0; i < queries.length; i ++) {
				queries[i].createdAt = Analytics.formatDatetimeString(queries[i].createdAt);
				queries[i].groupBy = queries[i].groupBy.join();
			}
			return queries;
		};

		$scope.loadRelatedQueries = function() {
			switch ($state.current.name) {
				case 'app.analytics.recentQueriesList':
					$scope.isLoading = true;
					// Fetch recent queries from backend
					Analytics.getRecentQueries($scope.currentPage)
						.success(function(data) {
							$scope.isLoading = false;
							data.queries = $scope.handleQueryResults(data.queries);
							$scope.total = data.total;
							$scope.queries = $scope.queries.concat(data.queries);
							if ($scope.total > $scope.queries.length) {
								$scope.hasMore = true;
							} else {
								$scope.hasMore = false;
							}
						})
						.error(function(error) {
							$scope.isLoading = false;
							Notify.alert('Error fetching recent queries: ' + error.message);
						});
					break;
				case 'app.analytics.myQueriesList':
					$scope.isLoading = true;
					// Fetch my/custom queries from backend
					Analytics.getMyQueries($scope.currentPage)
						.success(function(data) {
							$scope.isLoading = false;
							data.queries = $scope.handleQueryResults(data.queries);
							$scope.total = data.total;
							$scope.queries = $scope.queries.concat(data.queries);
							if ($scope.total > $scope.queries.length) {
								$scope.hasMore = true;
							} else {
								$scope.hasMore = false;
							}
						})
						.error(function(error) {
							$scope.isLoading = false;
							Notify.alert('Error fetching recent queries: ' + error.message);
						});
					break;
				default:
					break;
			}
		};
		$scope.loadRelatedQueries();

		$scope.goToQuerySection = function(query) {
			$state.go($scope.queryRoutes[query.name], {query: query});
		};

		$scope.reachedQueryListBottom = function() {
			if ($state.current.name === 'app.analytics.recentQueriesList' ||
				$state.current.name === 'app.analytics.myQueriesList') {
				if ($scope.hasMore) {
					$scope.currentPage ++;
					$scope.loadRelatedQueries();
				}
			}
		};
	}
]);