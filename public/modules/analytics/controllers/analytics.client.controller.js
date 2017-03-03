/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state', 'DTOptionsBuilder', 'DTColumnDefBuilder', 'Analytics', 'QUICKQUERIES',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, ngDialog, $state, DTOptionsBuilder, DTColumnDefBuilder, Analytics, QUICKQUERIES) {
        $scope.views = null;
        $scope.quickQueries = QUICKQUERIES;
        $scope.timeUnit = 'day';
        $scope.isSaved = false;
        $scope.dates = {};
        $scope.cronScheduleParam = {};

        // query params for graph and tab respectively
        $scope.graphQueryParam = {
            dateGroupBy: $scope.timeUnit,
            isSaved: $scope.isSaved
        };
        $scope.tabQueryParams = {
            cliques: {
                dateGroupBy: $scope.timeUnit,
                groupBy: 'pub_clique',
                isSaved: $scope.isSaved
            },
            publishers: {
                dateGroupBy: $scope.timeUnit,
                groupBy: 'publisher',
                populate: 'publisher',
                isSaved: $scope.isSaved
            },
            advertisers: {
                dateGroupBy: $scope.timeUnit,
                groupBy: 'advertiser',
                populate: 'advertiser',
                isSaved: $scope.isSaved
            }
        };

        // function to form cron task string based on user input of scheduler directive
        var formCronTaskString = function(cronScheduleParam) {
            var secondPos = 0,
                minutePos = 0,
                hourPos = 0,
                datePos = '*',
                monthPos = '*',
                weekdayPos = '*';
            if (cronScheduleParam.second) {
                secondPos = cronScheduleParam.second;
            }
            if (cronScheduleParam.minute) {
                minutePos = cronScheduleParam.minute;
            }
            if (cronScheduleParam.hour) {
                hourPos = cronScheduleParam.hour;
            }
            if (cronScheduleParam.date) {
                datePos = cronScheduleParam.date;
            }
            if (cronScheduleParam.month) {
                monthPos = cronScheduleParam.month.value;
            }
            if (cronScheduleParam.weekday) {
                weekdayPos = cronScheduleParam.weekday.value;
            }
            var cronString = '' + secondPos + ' ' + minutePos + ' ' + hourPos + ' ' + datePos + ' ' + monthPos + ' ' + weekdayPos;
            return cronString;
        };

        $scope.$watch('timeUnit', function() {
            $scope.graphQueryParam.dateGroupBy = $scope.timeUnit;
            $scope.tabQueryParams.cliques.dateGroupBy = $scope.timeUnit;
            $scope.tabQueryParams.publishers.dateGroupBy = $scope.timeUnit;
            $scope.tabQueryParams.advertisers.dateGroupBy = $scope.timeUnit;
        });
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
        // set query name depending on what current state/query section it is
        switch ($state.current.name) {
            case 'app.analytics.timeQuery':
                $scope.setQueryName('time');
                break;
        }
        $scope.goToQuerySection = function(queryName) {
            if (queryName === 'Time') {
                $scope.setQueryName('time');
                $location.path('/analytics/timeQuery');
            }
        };

        $scope.exportToCSV = function() {
            // download on the frontend
            var blobStringForCSV = Analytics.generateCSVData(JSON.stringify($scope.timeSeries));

            $scope.downloadFileName = Analytics.getCSVFileName();
            $scope.downloadFileBlob = new Blob([blobStringForCSV], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
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
                queryParam.schedule = formCronTaskString($scope.cronScheduleParam);
            }
            return queryParam;
        };

        $scope.summaryDateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;

        $scope.queryForGraphAndTabData = function() {
            $scope.getQueryGraph(null, $scope.graphQueryParam);
            $scope.getTabData();
            if ($scope.dates.startDate && $scope.dates.endDate) {
                $scope.queryResultTitle = $scope.dates.startDate.toISOString().slice(0, 16) + ' - ' + $scope.dates.endDate.toISOString().slice(0, 16) + ' / ' + $scope.timeUnit;
            }
        };

        $scope.getQueryGraph = function(dateShortCode, queryParam) {
            dateShortCode = dateShortCode || $scope.summaryDateRangeSelection;
            // get start date and end date for query params ready
            queryParam = $scope.prepareStartAndEndDate(dateShortCode, queryParam);
            // get cron task scheduling params ready
            queryParam = $scope.prepareCronScheduleParam(queryParam);

            // Pass "show-points" to graph directive to toggle line points
            // Only have this so points won't show for lines with tons of data
            $scope.showPoints = $scope.dateRanges[dateShortCode].showPoints;

            // query HourlyAdStats api endpoint
            HourlyAdStat.query(queryParam).then(function(response) {
                $scope.timeSeries = new MongoTimeSeries(response.data, queryParam.startDate, queryParam.endDate, user.tz, $scope.timeUnit, {
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
            $scope.summaryDateRangeSelection = dateShortCode;
        };

        $scope.dateRangeSelection = "7d";
        $scope.tabFunctions = {
            cliques: function(dateShortCode, queryParam) {
                queryParam = $scope.prepareStartAndEndDate(dateShortCode, queryParam);
                queryParam = $scope.prepareCronScheduleParam(queryParam);
                // query HourlyAdStats endpoint
                HourlyAdStat.query(queryParam).then(function(response) {
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
            publishers: function(dateShortCode, queryParam) {
                queryParam = $scope.prepareStartAndEndDate(dateShortCode, queryParam);
                queryParam = $scope.prepareCronScheduleParam(queryParam);
                // query HourlyAdStats api endpoint
                HourlyAdStat.query(queryParam).then(function(response) {
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
            advertisers: function(dateShortCode, queryParam) {
                queryParam = $scope.prepareStartAndEndDate(dateShortCode, queryParam);
                queryParam = $scope.prepareCronScheduleParam(queryParam);
                // query HourlyAdStats api endpoint
                HourlyAdStat.query(queryParam).then(function(response) {
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
        $scope.activeTab = 'cliques';
        $scope.getTabData = function(dateShortCode, tab) {
            dateShortCode = dateShortCode || $scope.summaryDateRangeSelection;
            tab = tab || $scope.activeTab;
            $scope.activeTab = tab;
            $scope.tabFunctions[tab](dateShortCode, $scope.tabQueryParams[tab]);
            $scope.dateRangeSelection = dateShortCode;
        };
    }
]);
