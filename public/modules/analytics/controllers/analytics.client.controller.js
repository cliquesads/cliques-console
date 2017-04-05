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
        if ($stateParams.query) {
            // History query entered from sidebar
            $scope.defaultQueryParam = $stateParams.query;
            $scope.defaultQueryParam._id = undefined;
            $scope.defaultQueryParam.isSaved = false;
        } else {
            $scope.defaultQueryParam = {
                name: '',
                dateRangeShortCode: '7d',
                dateGroupBy: 'day',
                humanizedDateRange: 'Last 7 Days'
            };
        }
        if ($scope.defaultQueryParam.dateRangeShortCode !== 'custom') {
            $scope.defaultQueryParam.startDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].startDate;
            $scope.defaultQueryParam.endDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].endDate;
        } else {
            var dateArr = $scope.defaultQueryParam.humanizedDateRange.split(' - ');
            $scope.defaultQueryParam.startDate = dateArr[0];
            $scope.defaultQueryParam.endDate = dateArr[1];
        }

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
                $scope.defaultQueryParam.name = queryName;
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
