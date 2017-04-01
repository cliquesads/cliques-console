/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$rootScope', '$stateParams', '$location', 'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state', 'DTOptionsBuilder', 'DTColumnDefBuilder', 'Analytics', 'QUICKQUERIES', 'QUERY_ROUTES', 'Notify',
    function($scope, $rootScope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, ngDialog, $state, DTOptionsBuilder, DTColumnDefBuilder, Analytics, QUICKQUERIES, QUERY_ROUTES, Notify) {
        $scope.views = null;
        $scope.quickQueries = QUICKQUERIES;
        $scope.queryRoutes = QUERY_ROUTES;
        /********************** DEFAULT QUERY PARAM VALUES **********************/
        $scope.timeUnit = 'day';
        $scope.isSaved = false;
        $scope.dates = {};
        $scope.filters = [];
        $scope.cronScheduleParam = {};
        $scope.summaryDateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;

        /*************************** QUERY PARAMS SETUP ***************************/
        $scope.graphQueryParam = {
            hasQueriedBefore: false,
            dateGroupBy: $scope.timeUnit,
            isSaved: $scope.isSaved
        };
        $scope.tableQueryParam = {
            hasQueriedBefore: false,
            dateGroupBy: $scope.timeUnit,
            groupBy: 'pub_clique',
            isSaved: $scope.isSaved
        };
        $scope.prepareDateGroupBy = function() {
            $scope.graphQueryParam.dateGroupBy = $scope.timeUnit;
            $scope.tableQueryParam.dateGroupBy = $scope.timeUnit;
        };
        $scope.toggleSave = function() {
            $scope.graphQueryParam.isSaved = $scope.isSaved;
            $scope.tableQueryParam.isSaved = $scope.isSaved;
        };
        $scope.setQueryName = function(name) {
            $scope.graphQueryParam.name = name;
            $scope.tableQueryParam.name = name;
        };
        $scope.setHistoryQueryFlag = function(booleanValue) {
            $scope.graphQueryParam.hasQueriedBefore = booleanValue;
            $scope.tableQueryParam.hasQueriedBefore = booleanValue;
        };
        $scope.prepareStartAndEndDate = function(dateShortCode, queryParam) {
            if (!$scope.dates.startDate || !$scope.dates.endDate) {
                queryParam.startDate = $scope.dateRanges[dateShortCode].startDate;
                queryParam.endDate = $scope.dateRanges[dateShortCode].endDate;
            } else {
                queryParam.startDate = $scope.dates.startDate;
                queryParam.endDate = $scope.dates.endDate;
            }
            return queryParam;
        };
        $scope.prepareCronScheduleParam = function(queryParam) {
            if (queryParam.isSaved) {
                queryParam.schedule = Analytics.formCronTaskString($scope.cronScheduleParam);
            }
            return queryParam;
        };
        $scope.prepareQueryHumanizedDateRange = function(queryParam, dateRangeString) {
            queryParam.humanizedDateRange = dateRangeString;
            return queryParam;
        };
        $scope.prepareQueryFilters = function(queryParam, filters) {
            queryParam.filters = filters;
            return queryParam;
        };
        $scope.setupAllQueryParams = function() {
            $scope.prepareDateGroupBy();
            // GRAPH PARAMS
            $scope.graphQueryParam = $scope.prepareStartAndEndDate($scope.summaryDateRangeSelection, $scope.graphQueryParam);
            $scope.graphQueryParam = $scope.prepareCronScheduleParam($scope.graphQueryParam);
            $scope.graphQueryParam = $scope.prepareQueryHumanizedDateRange($scope.graphQueryParam, $scope.queryResultTitle);
            $scope.graphQueryParam = $scope.prepareQueryFilters($scope.graphQueryParam, $scope.filters);
            // TABLE PARAMS
            $scope.tableQueryParam = $scope.prepareStartAndEndDate($scope.summaryDateRangeSelection, $scope.tableQueryParam);
            $scope.tableQueryParam = $scope.prepareCronScheduleParam($scope.tableQueryParam);
            $scope.tableQueryParam = $scope.prepareQueryHumanizedDateRange($scope.tableQueryParam, $scope.queryResultTitle);
            $scope.tableQueryParam = $scope.prepareQueryFilters($scope.tableQueryParam, $scope.filters);
        };
        // setup query params for the first query when page loads
        $scope.setupAllQueryParams();

        /************************* FILTER FOR CREATIVES/SITES *************************/
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
                $scope.setQueryName(queryName);
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
            $scope.setHistoryQueryFlag(true);
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
            $scope.filters = $scope.historyQuery.filters;
            $scope.setupAllQueryParams();
        }

        /********************* QUERY FUNCTIONS FOR QUICK QUERIES *********************/
        $scope.launchQuery = function() {
            if ($scope.dates.startDate && $scope.dates.endDate) {
                $scope.queryResultTitle = $scope.dates.startDate.toISOString().slice(0, 16) + ' - ' + $scope.dates.endDate.toISOString().slice(0, 16) + ' - ' + $scope.timeUnit;
            } else {
                $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;
            }
            // Setup query params before launching query requests
            $scope.setupAllQueryParams();
            $scope.setHistoryQueryFlag(false);
            // Send message to query-graph-table directive to launch query
            $rootScope.$broadcast('launchQuery', {});
        };
        // Listen to tableQueryResults message sent by child directive to receive the query results
        $scope.$on('tableQueryResults', function(event, args) {
            $scope.tableQueryResults = args;
        });

        /************************ CUSTOM QUERY & RESULTS ************************/
        $scope.showCustomizedQueryResult = function() {
            if ($scope.dates.startDate && $scope.dates.endDate) {
                $scope.queryResultTitle = $scope.dates.startDate.toISOString().slice(0, 16) + ' - ' + $scope.dates.endDate.toISOString().slice(0, 16) + ' - ' + $scope.timeUnit;
            } else {
                $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;
            }
            // Setup query params before launching query requests
            $scope.setupAllQueryParams();
            $scope.setHistoryQueryFlag(false);
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

        /**************************** EXPORT TO CSV ****************************/
        $scope.exportToCSV = function() {
            // Check if there are data to be exported
            if (!$scope.tableQueryResults) {
                Notify.alert('No data to export');
                return; 
            } else if ($scope.tableQueryResults.length === 0) {
                Notify.alert('No data to export');
                return;
            }
            // download on the frontend
            var blobStringForCSV = Analytics.generateCSVData(['date', 'placement', 'spend', 'imps', 'clicks', 'fillRate', 'CTR', 'CPM'], $scope.tableQueryResults);

            $scope.downloadFileName = Analytics.getCSVFileName();
            $scope.downloadFileBlob = new Blob([blobStringForCSV], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
        };
    }
]);
