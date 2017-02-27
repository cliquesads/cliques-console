/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser', 'HourlyAdStat', 'MongoTimeSeries', 'aggregationDateRanges', 'ngDialog', '$state', 'DTOptionsBuilder', 'DTColumnDefBuilder', 'Analytics', 'QUICKQUERIES',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, ngDialog, $state, DTOptionsBuilder, DTColumnDefBuilder, Analytics, QUICKQUERIES) {
        $scope.views = null;
        $scope.quickQueries = QUICKQUERIES;
        $scope.timeUnit = 'day';
        $scope.dates = {};

        $scope.changeTimeUnit = function(unit) {
            $scope.timeUnit = unit;
        };

        $scope.goToQuery = function(queryName) {
            if (queryName === 'Time') {
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

        $scope.queryWithCustomDates = function() {
            if ($scope.dates.startDate && $scope.dates.endDate) {
                $scope.getTimeQueryGraph();
                $scope.getTabData();
                $scope.queryResultTitle = $scope.dates.startDate.toISOString().slice(0, 16) + ' - ' + $scope.dates.endDate.toISOString().slice(0, 16) + ' / ' + $scope.timeUnit;
            }
        };
        $scope.$watch('dates.startDate', function() {
            $scope.queryWithCustomDates();
        });
        $scope.$watch('dates.endDate', function() {
            $scope.queryWithCustomDates();
        });
        $scope.$watch('timeUnit', function() {
            $scope.queryWithCustomDates();
        });

        $scope.summaryDateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.queryResultTitle = $scope.dateRanges[$scope.summaryDateRangeSelection].label;
        $scope.getTimeQueryGraph = function(dateShortCode) {
            dateShortCode = dateShortCode || $scope.summaryDateRangeSelection;
            var startDate, endDate;
            if (!$scope.dates.startDate || !$scope.dates.endDate) {
                startDate = $scope.dateRanges[dateShortCode].startDate;
                endDate = $scope.dateRanges[dateShortCode].endDate;
            } else {
                startDate = $scope.dates.startDate;
                endDate = $scope.dates.endDate;
            }

            // Pass "show-points" to graph directive to toggle line points
            // Only have this so points won't show for lines with tons of data
            $scope.showPoints = $scope.dateRanges[dateShortCode].showPoints;

            // query HourlyAdStats api endpoint
            HourlyAdStat.query({
                dateGroupBy: $scope.timeUnit,
                startDate: startDate,
                endDate: endDate
            }).then(function(response) {
                $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, $scope.timeUnit, {
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

        $scope.dateRangeSelection = "30d";
        $scope.tabFunctions = {
            cliques: function(dateShortCode) {
                var startDate, endDate;
                if (!$scope.dates.startDate || !$scope.dates.endDate) {
                    startDate = $scope.dateRanges[dateShortCode].startDate;
                    endDate = $scope.dateRanges[dateShortCode].endDate;
                } else {
                    startDate = $scope.dates.startDate;
                    endDate = $scope.dates.endDate;
                }
                // query HourlyAdStats endpoint
                HourlyAdStat.query({
                    groupBy: 'pub_clique',
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response) {
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
            publishers: function(dateShortCode) {
                var startDate, endDate;
                if (!$scope.dates.startDate || !$scope.dates.endDate) {
                    startDate = $scope.dateRanges[dateShortCode].startDate;
                    endDate = $scope.dateRanges[dateShortCode].endDate;
                } else {
                    startDate = $scope.dates.startDate;
                    endDate = $scope.dates.endDate;
                }
                // query HourlyAdStats api endpoint
                HourlyAdStat.query({
                    groupBy: 'publisher',
                    populate: 'publisher',
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response) {
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
            advertisers: function(dateShortCode) {
                var startDate, endDate;
                if (!$scope.dates.startDate || !$scope.dates.endDate) {
                    startDate = $scope.dateRanges[dateShortCode].startDate;
                    endDate = $scope.dateRanges[dateShortCode].endDate;
                } else {
                    startDate = $scope.dates.startDate;
                    endDate = $scope.dates.endDate;
                }
                // query HourlyAdStats api endpoint
                HourlyAdStat.query({
                    groupBy: 'advertiser',
                    populate: 'advertiser',
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response) {
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
            tab = tab || $scope.activeTab;
            $scope.activeTab = tab;
            $scope.tabFunctions[tab](dateShortCode);
            $scope.dateRangeSelection = dateShortCode;
        };
    }
]);
