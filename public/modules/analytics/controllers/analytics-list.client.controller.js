/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsListController', ['$scope', 'Analytics', 'Query', 'Notify', '$state', '$window',
	function($scope, Analytics, Query, Notify, $state, $window) {
		$scope.queries = [];
		$scope.total = 0;
		$scope.currentPage = 1;
		$scope.itemsPerPage = 25;
		$scope.isLoading = false;
		$scope.hasMore = false;

		if ($state.current.name === 'app._analytics.analytics.recentQueriesList') {
			$scope.queriesListTitle = 'Recent Queries';
		} else {
			$scope.queriesListTitle = 'My Queries';
		}

		// Make query results human readable
		$scope.handleQueryResults = function(queries) {
			for (var i = 0; i < queries.length; i ++) {
				queries[i].createdAt = Analytics.formatDatetimeString(queries[i].createdAt);
			}
			return queries;
		};

		$scope.loadRelatedQueries = function() {

			$scope.isLoading = true;
			// Fetch recent queries from backend
			var queryParams = {
				page: $scope.currentPage,
				per_page: $scope.itemsPerPage,
				sort_by: "createdAt,desc"
			};
			if ($state.current.name === 'app._analytics.analytics.myQueriesList'){
				queryParams.isSaved = true;
			}
			Query.query(queryParams).$promise.then(function(data) {
				$scope.isLoading = false;
				data = $scope.handleQueryResults(data);
				$scope.total += data.length;
				$scope.queries = $scope.queries.concat(data);
				$scope.hasMore = (data.length === $scope.itemsPerPage);
			}, function(error) {
				$scope.isLoading = false;
				Notify.alert('Error fetching queries: ' + error.message);
			});
		};
		$scope.loadRelatedQueries();

		$scope.goToQuerySection = function(query) {
			if (query.isSaved) {
				$state.go('app._analytics.analytics.myQueriesList.myQuery', {queryId: query._id});
			} else {
				$state.go('app._analytics.analytics.recentQueriesList.recentQuery', {queryId: query._id});
			}
		};

		$scope.delete = function(query) {
			new Query(query).$delete(function(response) {
				for (var i = 0; i < $scope.queries.length; i ++) {
					if ($scope.queries[i]._id === response._id) {
						$scope.queries.splice(i, 1);
						break;
					}
				}
				Notify.alert('Query deleted successfully.', {
					status: 'success'
				});
			});
		};

		$scope.reachedQueryListBottom = function() {
			if ($state.current.name === 'app._analytics.analytics.recentQueriesList' ||
				$state.current.name === 'app._analytics.analytics.myQueriesList') {
				if ($scope.hasMore) {
					$scope.currentPage ++;
					$scope.loadRelatedQueries();
				}
			}
		};
	}
]);