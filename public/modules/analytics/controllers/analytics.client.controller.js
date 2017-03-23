/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$rootScope', '$stateParams', '$location', 'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state', 'DTOptionsBuilder', 'DTColumnDefBuilder', 'Analytics', 'QUICKQUERIES', 'QUERY_ROUTES', 'QUERY_FILTERS', 'Notify',
    function($scope, $rootScope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, ngDialog, $state, DTOptionsBuilder, DTColumnDefBuilder, Analytics, QUICKQUERIES, QUERY_ROUTES, QUERY_FILTERS, Notify) {
        $scope.views = null;
        $scope.quickQueries = QUICKQUERIES;
        $scope.queryRoutes = QUERY_ROUTES;
        $scope.queryFilterConstants = QUERY_FILTERS;
        /********************** DEFAULT QUERY PARAM VALUES **********************/
        $scope.timeUnit = 'day';
        $scope.isSaved = false;
        $scope.dates = {};
        $scope.filters = [];
        $scope.cronScheduleParam = {};
        $scope.summaryDateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;
        $scope.activeTab = 'cliques';

        /*************************** QUERY PARAMS SETUP ***************************/
        $scope.graphQueryParam = {
            hasQueriedBefore: false,
            dateGroupBy: $scope.timeUnit,
            isSaved: $scope.isSaved
        };
        $scope.tabQueryParams = {
            cliques: {
                hasQueriedBefore: false,
                dateGroupBy: $scope.timeUnit,
                groupBy: 'pub_clique',
                isSaved: $scope.isSaved
            },
            publishers: {
                hasQueriedBefore: false,
                dateGroupBy: $scope.timeUnit,
                groupBy: 'publisher',
                populate: 'publisher',
                isSaved: $scope.isSaved
            },
            advertisers: {
                hasQueriedBefore: false,
                dateGroupBy: $scope.timeUnit,
                groupBy: 'advertiser',
                populate: 'advertiser',
                isSaved: $scope.isSaved
            }
        };
        $scope.prepareDateGroupBy = function() {
            $scope.graphQueryParam.dateGroupBy = $scope.timeUnit;
            $scope.tabQueryParams.cliques.dateGroupBy = $scope.timeUnit;
            $scope.tabQueryParams.publishers.dateGroupBy = $scope.timeUnit;
            $scope.tabQueryParams.advertisers.dateGroupBy = $scope.timeUnit;
        };
        $scope.toggleSave = function() {
            $scope.graphQueryParam.isSaved = $scope.isSaved;
            $scope.tabQueryParams.cliques.isSaved = $scope.isSaved;
            $scope.tabQueryParams.publishers.isSaved = $scope.isSaved;
            $scope.tabQueryParams.advertisers.isSaved = $scope.isSaved;
        };
        $scope.setQueryName = function(name) {
            $scope.graphQueryParam.name = name;
            $scope.tabQueryParams.cliques.name = name;
            $scope.tabQueryParams.publishers.name = name;
            $scope.tabQueryParams.advertisers.name = name;
        };
        $scope.setHistoryQueryFlag = function(booleanValue) {
            $scope.graphQueryParam.hasQueriedBefore = booleanValue;
            $scope.tabQueryParams.cliques.hasQueriedBefore = booleanValue;
            $scope.tabQueryParams.publishers.hasQueriedBefore = booleanValue;
            $scope.tabQueryParams.advertisers.hasQueriedBefore = booleanValue;
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
            // CLIQUES TAB PARAMS
            $scope.tabQueryParams.cliques = $scope.prepareStartAndEndDate($scope.summaryDateRangeSelection, $scope.tabQueryParams.cliques);
            $scope.tabQueryParams.cliques = $scope.prepareCronScheduleParam($scope.tabQueryParams.cliques);
            $scope.tabQueryParams.cliques = $scope.prepareQueryHumanizedDateRange($scope.tabQueryParams.cliques, $scope.queryResultTitle);
            $scope.tabQueryParams.cliques = $scope.prepareQueryFilters($scope.tabQueryParams.cliques, $scope.filters);
            // PUBLISHERS TAB PARAMS
            $scope.tabQueryParams.publishers = $scope.prepareStartAndEndDate($scope.summaryDateRangeSelection, $scope.tabQueryParams.publishers);
            $scope.tabQueryParams.publishers = $scope.prepareCronScheduleParam($scope.tabQueryParams.publishers);
            $scope.tabQueryParams.publishers = $scope.prepareQueryHumanizedDateRange($scope.tabQueryParams.publishers, $scope.queryResultTitle);
            $scope.tabQueryParams.publishers = $scope.prepareQueryFilters($scope.tabQueryParams.publishers, $scope.filters);
            // ADVERTISERS TAB PARAMS
            $scope.tabQueryParams.advertisers = $scope.prepareStartAndEndDate($scope.summaryDateRangeSelection, $scope.tabQueryParams.advertisers);
            $scope.tabQueryParams.advertisers = $scope.prepareCronScheduleParam($scope.tabQueryParams.advertisers);
            $scope.tabQueryParams.advertisers = $scope.prepareQueryHumanizedDateRange($scope.tabQueryParams.advertisers, $scope.queryResultTitle);
            $scope.tabQueryParams.advertisers = $scope.prepareQueryFilters($scope.tabQueryParams.advertisers, $scope.filters);
        };
        // setup query params for the first query when page loads
        $scope.setupAllQueryParams();

        /************************* FILTER FOR CREATIVES/SITES *************************/
        $scope.getCreatives = function() {
            Analytics.getAllCreatives()
            .success(function(data) {
                $scope.allCreatives = data;
            })
            .error(function(error) {
                Notify.alert(error.message, {status: 'danger'});
            });
        };
        $scope.creativeChanged = function() {
            if ($scope.selectedCreative) {
                // setup creative filter for query params
                $scope.graphQueryParam.creative = $scope.selectedCreative._id;
                $scope.tabQueryParams.cliques.creative = $scope.selectedCreative._id;
                $scope.tabQueryParams.publishers.creative = $scope.selectedCreative._id;
                $scope.tabQueryParams.advertisers.creative = $scope.selectedCreative._id;
            }
        };
        $scope.getSites = function() {
            Analytics.getAllSites()
            .success(function(data) {
                $scope.allSites = data;
            })
            .error(function(error) {
                Notify.alert(error.message, {status: 'danger'});
            });
        };
        $scope.siteChanged = function() {
            if ($scope.selectedSite) {
                // setup site filter for query params
                $scope.graphQueryParam.site = $scope.selectedSite._id;
                $scope.tabQueryParams.cliques.site = $scope.selectedSite._id;
                $scope.tabQueryParams.publishers.site = $scope.selectedSite._id;
                $scope.tabQueryParams.advertisers.site = $scope.selectedSite._id;
            }
        };

        /******************** DIFFERENT QUERY ENTRIES/SECTIONS ********************/
        // set query name and filters depending on what current state/query section it is
        for (var queryName in $scope.queryRoutes) {
            if ($state.current.name === $scope.queryRoutes[queryName]) {
                $scope.setQueryName(queryName);
                $scope.filters = $scope.queryFilterConstants[queryName];
                if (queryName === 'Creatives') {
                    $scope.getCreatives();
                } else if (queryName === 'Sites') {
                    $scope.getSites();
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

        /**************************** QUERY FUNCTIONS ****************************/
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
        // Listen to tabQueryResults message sent by child directive to receive the query results
        $scope.$on('tabQueryResults', function(event, args) {
            $scope.tabQueryResults = args;
        });

        /**************************** EXPORT TO CSV ****************************/
        $scope.exportToCSV = function() {
            // Check if there are data to be exported
            if (!$scope.tabQueryResults) {
                Notify.alert('No data to export');
                return; 
            } else if ($scope.tabQueryResults.length === 0) {
                Notify.alert('No data to export');
                return;
            }
            // download on the frontend
            var blobStringForCSV = Analytics.generateCSVData(['date', 'placement', 'spend', 'imps', 'clicks', 'fillRate', 'CTR', 'CPM'], $scope.tabQueryResults);

            $scope.downloadFileName = Analytics.getCSVFileName();
            $scope.downloadFileBlob = new Blob([blobStringForCSV], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
        };
    }
]);
