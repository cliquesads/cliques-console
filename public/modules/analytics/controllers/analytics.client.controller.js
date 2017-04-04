/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$rootScope', '$stateParams', 'aggregationDateRanges', '$state', 'Analytics', 'QUICKQUERIES', 'QUERY_ROUTES', 'Notify',
    function($scope, $rootScope, $stateParams, aggregationDateRanges, $state, Analytics, QUICKQUERIES, QUERY_ROUTES, Notify) {
        $scope.views = null;
        // Depending on different organization type, quick query options may vary
        $scope.quickQueries = QUICKQUERIES[user.organization.effectiveOrgType];
        $scope.queryRoutes = QUERY_ROUTES;
        /********************** DEFAULT QUERY PARAM VALUES **********************/
        $scope.dateRanges = aggregationDateRanges(user.tz);

        /*************************** QUERY PARAMS SETUP ***************************/
        $scope.defaultQueryParam = {
            queryName: '',
            dateRangeShortCode: '7d',
            dateGroupBy: 'day',
            humanizedDateRange: 'Last 7 Days'
        };

        /********************** FILTER OPTIONS FOR CREATIVES/SITES **********************/
        $scope.hasCampaignFilter = false;
        $scope.hasSiteFilter = false;
        switch (user.organization.effectiveOrgType) {
            case 'networkAdmin':
                $scope.hasCampaignFilter = true;
                $scope.hasSiteFilter = true;
                break;
            case 'advertiser':
                $scope.hasCampaignFilter = true;
                break;
            case 'publisher':
                $scope.hasSiteFilter = true;
                break;
            default:
                break;
        }

        /******************** DIFFERENT QUERY ENTRIES/SECTIONS ********************/
        // set query name, filters and available report settings depending on what current state/query section it is
        $scope.availableSettings = {
            timePeriod: true,
            dateGroupBy: false,
            campaignFilter: $scope.hasCampaignFilter,
            siteFilter: $scope.hasSiteFilter
        };
        for (var queryName in $scope.queryRoutes) {
            if ($state.current.name === $scope.queryRoutes[queryName]) {
                $scope.defaultQueryParam.queryName = queryName;
                // Set available report settings for different queries
                if (queryName === 'Time' || queryName === 'Custom') {
                    $scope.availableSettings.dateGroupBy = true;
                }
                break;
            }
        }
        $scope.goToQuerySection = function(queryName) {
            $state.go($scope.queryRoutes[queryName]);
        };

        /*********************** HISTORY QUERY FROM SIDEBAR ***********************/
        $scope.historyQuery = $stateParams.query;
        if ($scope.historyQuery) {
            // If user entered the query section through entries in analytics-sidebar, $stateParams.query will be the history query that user selected on the sidebar, so reconstruct query request based on the selected history query
            // Check if the selected query is queried based on date short code
            var dateShortCodeUsed = false;
            var humanizedDateRange = $scope.historyQuery.humanizedDateRange;
            for (var key in aggregationDateRanges(user.tz)) {
                if (aggregationDateRanges(user.tz)[key].label === humanizedDateRange) {
                    $scope.summaryDateRangeSelection = key;
                    dateShortCodeUsed = true;
                }
            }
            if (!dateShortCodeUsed) {
                // start/end date designated by user manually for this history query
                var dateArr = humanizedDateRange.split(' - ');
                $scope.dates.startDate = dateArr[0];
                $scope.dates.endDate = dateArr[1];
            }

            // history query datetime unit
            $scope.timeUnit = $scope.historyQuery.dateGroupBy;
            $scope.queryResultTitle = humanizedDateRange;
        }

        /************************ CUSTOM QUERY & RESULTS ************************/
        $scope.showCustomizedQueryResult = function() {
            if ($scope.dates.startDate && $scope.dates.endDate) {
                $scope.queryResultTitle = $scope.dates.startDate.toISOString().slice(0, 16) + ' - ' + $scope.dates.endDate.toISOString().slice(0, 16) + ' - ' + $scope.timeUnit;
            } else {
                $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;
            }
            // Setup query params before launching query requests
            var customQuery = {
                dateRanges: $scope.dateRanges,
                queryResultTitle: $scope.queryResultTitle,
                timeUnit: $scope.timeUnit,
                summaryDateRangeSelection: $scope.summaryDateRangeSelection,
                graphQueryParam: $scope.graphQueryParam,
                tableQueryParam: $scope.tableQueryParam
            };
            $state.go('app.analytics.customizeQuery.queryResult', {customQuery: customQuery});
        };
        if ($stateParams.customQuery) {
            $scope.customQuery = $stateParams.customQuery;
            $rootScope.$broadcast('launchQuery', {});
        } else if ($state.current.name === 'app.analytics.customizeQuery.queryResult') {
            $state.go('app.analytics.customizeQuery', {});
        }
    }
]);
