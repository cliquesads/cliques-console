/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsSidebarController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state',
    'Notify', 'Analytics', 'Query',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries,
        aggregationDateRanges, ngDialog, $state, Notify, Analytics, Query) {

        // Fetch recent queries from backend
        var i;
        $scope.ITEMS_PER_PAGE = 25;
        Query.query({
            page: 1,
            per_page: $scope.ITEMS_PER_PAGE,
            sort_by: "createdAt,desc"
        }).$promise.then(function(data){
            // showing only 5 recent queries at most on sidebar
            if (data.length <= 5) {
                $scope.recentQueries = data;
            } else {
                $scope.recentQueries = data.slice(0, 5);
            }
            // just need to know if first page length is greater than 5
            // for purposes of showing viewAll. Don't need to know full length.
            $scope.totalRecentQueries = data.length;
            // format creation datetime for each recent query
            for (i = 0; i < $scope.recentQueries.length; i ++) {
                $scope.recentQueries[i].createdAt = Analytics.formatDatetimeString($scope.recentQueries[i].createdAt);
            }
        }, function(error) {
            Notify.alert('Error fetching recent queries: ' + error.message);
        });

        // Fetch my queries from backend
        Query.query({
            page: 1,
            per_page: $scope.ITEMS_PER_PAGE,
            sort_by: "createdAt,desc",
            isSaved: true
        }).$promise.then(function(data) {
            if (data.length <= 5) {
                $scope.myQueries = data;
            } else {
                $scope.myQueries = data.slice(0, 5);
            }
            // just need to know if first page length is greater than 5
            // for purposes of showing viewAll. Don't need to know full length.
            $scope.totalMyQueries = data.length;
            // format creation datetime for each my query
            for (i = 0; i < $scope.myQueries.length; i ++) {
                $scope.myQueries[i].createdAt = Analytics.formatDatetimeString($scope.myQueries[i].createdAt);
            }
        }, function(error) {
            Notify.alert('Error fetching my queries: ' + error.message);
        });
    }
]);
