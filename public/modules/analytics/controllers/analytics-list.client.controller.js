/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsListController', ['$scope', 'Analytics', 'Notify', '$state', '$window',
	function($scope, Analytics, Notify, $state, $window) {
		$scope.queries = [];
		$scope.total = 0;
		$scope.currentPage = 1;
		$scope.isLoading = false;
		$scope.hasMore = false;

		if ($state.current.name === 'app.analytics.recentQueriesList') {
			$scope.queriesListTitle = 'Recent Queries';
		} else {
			$scope.queriesListTitle = 'Custom Queries';
		}

		// Make query results human readable
		$scope.handleQueryResults = function(queries) {
			for (var i = 0; i < queries.length; i ++) {
				queries[i].createdAt = Analytics.formatDatetimeString(queries[i].createdAt);
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
				case 'app.analytics.customQueriesList':
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
			if (query.type !== 'custom') {
				$state.go('app.analytics.quickQueries.' + query.type, {query: query});
			} else {
				$state.go('app.analytics.customize.result', {query: query});
			}
		};

		$scope.reachedQueryListBottom = function() {
			if ($state.current.name === 'app.analytics.recentQueriesList' ||
				$state.current.name === 'app.analytics.customQueriesList') {
				if ($scope.hasMore) {
					$scope.currentPage ++;
					$scope.loadRelatedQueries();
				}
			}
		};
	}
]);