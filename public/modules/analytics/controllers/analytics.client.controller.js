/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$rootScope','$scope', '$stateParams', 'aggregationDateRanges', '$state', 'Analytics', 'QUICKQUERIES',
    function($rootScope, $scope, $stateParams, aggregationDateRanges, $state, Analytics, QUICKQUERIES) {
        $scope.user = user;

        // Depending on different organization type, quick query options may vary
        $scope.quickQueries = QUICKQUERIES[$rootScope.role];
        $scope.currentQueryType = $state.current.queryType;

        /********************** DEFAULT QUERY PARAM VALUES **********************/
        $scope.dateRanges = aggregationDateRanges(user.tz);
        if ($stateParams.query) {
            // History query entered from sidebar or history query list
            $scope.defaultQueryParam = $stateParams.query;
            $scope.defaultQueryParam.populate = $scope.defaultQueryParam.groupBy;
            // delete date related
            delete $scope.defaultQueryParam.createdAt;
            delete $scope.defaultQueryParam.updatedAt;
            delete $scope.defaultQueryParam.nextRun;
        } else if ($scope.currentQueryType) {
            // new query
            // Copy the relative defaultQueryParam to a new object, so any changes to $scope.defaultQueryParam doesn't alter the values in the original object
            $scope.defaultQueryParam = JSON.parse(JSON.stringify($scope.quickQueries[$scope.currentQueryType].defaultQueryParam));
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
        }

        /************** AVAILABLE SETTINGS FOR QUERY ENTRIES/SECTIONS **************/
        if ($scope.currentQueryType) {
            $scope.availableSettings = $scope.quickQueries[$scope.currentQueryType].availableSettings;
        }
        $scope.goToQuerySection = function(queryRoute) {
            $state.go(queryRoute);
        };
    }
]).controller('AnalyticsCustomizeController', [
    '$scope',
    function($scope) {
    }
]);
