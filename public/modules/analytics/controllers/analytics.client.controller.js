/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state', 'DTOptionsBuilder', 'DTColumnDefBuilder', 'Analytics', 'QUICKQUERIES',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, ngDialog, $state, DTOptionsBuilder, DTColumnDefBuilder, Analytics, QUICKQUERIES) {
        $scope.views = null;
        $scope.quickQueries = QUICKQUERIES;
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

        /******************** DIFFERENT QUERY ENTRIES/SECTIONS ********************/
        // set query name depending on what current state/query section it is
        switch ($state.current.name) {
            case 'app.analytics.timeQuery':
                $scope.setQueryName('Time');
                break;
            case 'app.analytics.sitesQuery':
                $scope.setQueryName('Sites');
                break;
            default:
                break;
        }
        $scope.goToQuerySection = function(queryName) {
            $scope.setQueryName(queryName);
            switch (queryName) {
                case 'Time':
                    $state.go('app.analytics.timeQuery');
                    break;
                case 'Sites':
                    $state.go('app.analytics.sitesQuery');
                    break;
                default:
                    break;
            }
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

        /**
         * Depending on different user types(advertiser, publisher or networkAdmin), the query function can be different
         */
        if (user) {
            if (user.organization.organization_types.indexOf('networkAdmin') > -1){
                $scope.queryFunction = HourlyAdStat.query;
            } else if (user.organization.organization_types.indexOf('advertiser') > -1){
                $scope.queryFunction = HourlyAdStat.advSummaryQuery;
            } else if (user.organization.organization_types.indexOf('publisher') > -1){
                $scope.queryFunction = HourlyAdStat.pubSummaryQuery;
            }
        }

        /**************************** QUERY FUNCTIONS ****************************/
        $scope.queryForGraphAndTabData = function() {
            if ($scope.dates.startDate && $scope.dates.endDate) {
                $scope.queryResultTitle = $scope.dates.startDate.toISOString().slice(0, 16) + ' - ' + $scope.dates.endDate.toISOString().slice(0, 16) + ' - ' + $scope.timeUnit;
            } else {
                $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;
            }
            // Setup query params before launching query requests
            $scope.setupAllQueryParams();
            $scope.setHistoryQueryFlag(false);
            // Actual query requests happen here
            $scope.getQueryGraph($scope.graphQueryParam);
            $scope.getTabData();
        };
        $scope.getQueryGraph = function() {
            // Pass "show-points" to graph directive to toggle line points
            // Only have this so points won't show for lines with tons of data
            $scope.showPoints = $scope.dateRanges[$scope.summaryDateRangeSelection].showPoints;

            // query HourlyAdStats api endpoint
            $scope.queryFunction($scope.graphQueryParam).then(function(response) {
                $scope.timeSeries = new MongoTimeSeries(response.data, $scope.graphQueryParam.startDate, $scope.graphQueryParam.endDate, user.tz, $scope.timeUnit, {
                    fields: [
                        'imps', {
                            'CTR': function(row) {
                                return row.clicks / row.imps;
                            }
                        },
                        'clicks',
                        'spend'
                    ]
                });
            });
        };

        $scope.tabFunctions = {
            cliques: function() {
                // query HourlyAdStats endpoint
                $scope.queryFunction($scope.tabQueryParams.cliques).then(function(response) {
                    // build datatables options object
                    $scope.dtOptions = DTOptionsBuilder.newOptions();
                    $scope.dtOptions.withOption('paging', false);
                    $scope.dtOptions.withOption('searching', false);
                    $scope.dtOptions.withOption('scrollX', true);
                    $scope.dtOptions.withOption('order', [
                        [1, 'desc']
                    ]);
                    // Not entirely sure if this is necessary
                    $scope.dtColumnDefs = [
                        DTColumnDefBuilder.newColumnDef(0),
                        DTColumnDefBuilder.newColumnDef(1),
                        DTColumnDefBuilder.newColumnDef(2),
                        DTColumnDefBuilder.newColumnDef(3),
                        DTColumnDefBuilder.newColumnDef(4),
                        DTColumnDefBuilder.newColumnDef(5)
                    ];
                    $scope.cliqueData = response.data;
                });
            },
            publishers: function() {
                // query HourlyAdStats api endpoint
                $scope.queryFunction($scope.tabQueryParams.publishers).then(function(response) {
                    // build datatables options object
                    $scope.dtOptions_pubs = DTOptionsBuilder.newOptions();
                    $scope.dtOptions_pubs.withOption('paging', false);
                    $scope.dtOptions_pubs.withOption('searching', false);
                    $scope.dtOptions_pubs.withOption('scrollX', true);
                    $scope.dtOptions_pubs.withOption('order', [
                        [2, 'desc']
                    ]);
                    // Not entirely sure if this is necessary
                    $scope.dtColumnDefs_pubs = [
                        DTColumnDefBuilder.newColumnDef(0),
                        DTColumnDefBuilder.newColumnDef(1),
                        DTColumnDefBuilder.newColumnDef(2),
                        DTColumnDefBuilder.newColumnDef(3),
                        DTColumnDefBuilder.newColumnDef(4),
                        DTColumnDefBuilder.newColumnDef(5),
                        DTColumnDefBuilder.newColumnDef(6)
                    ];
                    $scope.publisherData = response.data;
                });
            },
            advertisers: function() {
                // query HourlyAdStats api endpoint
                $scope.queryFunction($scope.tabQueryParams.advertisers).then(function(response) {
                    // build datatables options object
                    $scope.dtOptions_advs = DTOptionsBuilder.newOptions();
                    $scope.dtOptions_advs.withOption('paging', false);
                    $scope.dtOptions_advs.withOption('searching', false);
                    $scope.dtOptions_advs.withOption('scrollX', true);
                    $scope.dtOptions_advs.withOption('order', [
                        [2, 'desc']
                    ]);
                    // Not entirely sure if this is necessary
                    $scope.dtColumnDefs_advs = [
                        DTColumnDefBuilder.newColumnDef(0),
                        DTColumnDefBuilder.newColumnDef(1),
                        DTColumnDefBuilder.newColumnDef(2),
                        DTColumnDefBuilder.newColumnDef(3),
                        DTColumnDefBuilder.newColumnDef(4),
                        DTColumnDefBuilder.newColumnDef(5),
                        DTColumnDefBuilder.newColumnDef(6)
                    ];
                    $scope.advertiserData = response.data;
                });
            }
        };
        $scope.getTabData = function(tab) {
            tab = tab || $scope.activeTab;
            $scope.activeTab = tab;
            $scope.tabFunctions[tab]();
        };

        /**************************** EXPORT TO CSV ****************************/
        $scope.exportToCSV = function() {
            // download on the frontend
            var blobStringForCSV = Analytics.generateCSVData(JSON.stringify($scope.timeSeries));

            $scope.downloadFileName = Analytics.getCSVFileName();
            $scope.downloadFileBlob = new Blob([blobStringForCSV], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
        };
    }
]);
