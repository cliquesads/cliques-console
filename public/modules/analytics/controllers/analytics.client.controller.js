/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$rootScope','$scope', '$state', 'Analytics', 'QUICKQUERIES',
    function($rootScope, $scope, $state, Analytics, QUICKQUERIES) {
        // Depending on different organization type, quick query options may vary
        $scope.quickQueries = QUICKQUERIES[$rootScope.role];
        var currentQueryType = $state.current.queryType;

        if (currentQueryType) {
            /********************** DEFAULT QUERY PARAM VALUES **********************/
            // new query
            // Copy the relative defaultQueryParam to a new object, so any changes to $scope.defaultQueryParam doesn't alter the values in the original object
            $scope.defaultQueryParam = angular.copy($scope.quickQueries[currentQueryType].defaultQueryParam);
            // Prepare dataHeaders for this new query
            $scope.defaultQueryParam.dataHeaders = [];
            var tableHeaders = Analytics.getQueryTableHeaders(
                $scope.defaultQueryParam.type,
                $scope.defaultQueryParam.dateGroupBy,
                $rootScope.role,
                null
            );
            tableHeaders.forEach(function(header) {
                if (header.selected) {
                    $scope.defaultQueryParam.dataHeaders.push(header.name);
                }
            });

            /************** AVAILABLE SETTINGS FOR QUERY ENTRIES/SECTIONS **************/
            $scope.availableSettings = $scope.quickQueries[currentQueryType].availableSettings;
        }
    }
]).controller('HistoryAnalyticsController', [
    '$rootScope', '$scope', 'query', 'QUICKQUERIES',
    function($rootScope, $scope, query, QUICKQUERIES) {
        // History query entered from sidebar or history query list
        $scope.defaultQueryParam = query;

        $scope.quickQueries = QUICKQUERIES[$rootScope.role];
        $scope.availableSettings = $scope.quickQueries[query.type].availableSettings;
    }
]).controller('AnalyticsCustomizeController', [
    '$scope',
    function($scope) {
    }
]);