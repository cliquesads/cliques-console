/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsListController', ['$scope', 'Analytics', 'Notify', '$state', '$window',
	function($scope, Analytics, Notify, $state, $window) {
		$scope.queries = [];
		$scope.total = 0;
		$scope.currentPage = 1;
		$scope.isLoading = false;
		$scope.hasMore = false;

		$scope.handleQueryResults = function(queries) {
			for (var i = 0; i < queries.length; i ++) {
				queries[i].createdAt = Analytics.formatDatetimeString(queries[i].createdAt);
				queries[i].groupBy = queries[i].groupBy.join();
			}
			return queries;
		};

		$scope.loadRelatedQueries = function() {
			switch ($state.current.name) {
				case 'app.analytics.recentQueries':
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
				case 'app.analytics.myQueries':
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
			switch (query.name) {
				case 'Time':
					$state.go('app.analytics.timeQuery', {query: query});
					break;
				case 'Sites':
					$state.go('app.analytics.sitesQuery', {query: query});
					break;
				default:
					break;
			}
		};

		angular.element($window).bind("scroll", function() {
			var windowHeight = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
			var body = document.body, html = document.documentElement;
			var docHeight = Math.max(body.scrollHeight,
			body.offsetHeight, html.clientHeight,html.scrollHeight, html.offsetHeight);
			var windowBottom = windowHeight + window.pageYOffset;
			if (windowBottom >= docHeight) {
				// reached bottom, fetching next page if there're more screenshots
				if ($scope.hasMore) {
					$scope.currentPage ++;
					$scope.loadRelatedQueries();
				}
			}
		});
	}
]);