/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('AdminDashboardController',
    ['$scope','$location','$window','Advertiser','Publisher','DTOptionsBuilder','DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication',
        function($scope, $location, $window, Advertiser, Publisher, DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication) {
            $scope.creatives = [];
            $scope.advertisers = Advertiser.query(function(advertisers){
                advertisers.forEach(function(adv){
                    adv.campaigns.forEach(function(camp){
                        camp.creativegroups.forEach(function(crg){
                            crg.creatives.forEach(function(cr){
                                var description = camp.name + ' - ' + cr.name;
                                var link = '#!/advertiser/' + adv._id + '/campaign/' + camp._id;
                                $scope.creatives.push({
                                    id: cr._id,
                                    title: adv.name,
                                    description: description,
                                    src: cr.secureUrl,
                                    link: link
                                });
                            });
                        });
                    });
                });
            });

            $scope.publishers = Publisher.query();
            HourlyAdStat.query({}).then(function(response){
                $scope.adStats = response.data;
            });

            // See service in aggregations module for details on aggregationDateRanges object
            $scope.summaryDateRangeSelection = "7d";
            $scope.dateRanges = aggregationDateRanges(user.tz);
            $scope.getDashboardGraph = function(dateShortCode) {
                dateShortCode = dateShortCode || $scope.summaryDateRangeSelection;
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;

                // Pass "show-points" to graph directive to toggle line points
                // Only have this so points won't show for lines with tons of data
                $scope.showPoints = $scope.dateRanges[dateShortCode].showPoints;

                // For grouping & MongoTimeSeries generation
                var timeUnit = 'day';

                // query HourlyAdStats api endpoint
                HourlyAdStat.query({
                    dateGroupBy: timeUnit,
                    startDate: startDate,
                    endDate: endDate
                }).then(function (response) {
                    $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                        {
                            fields: [
                                'imps',
                                {'CTR':
                                    function (row) {
                                        return row.clicks / row.imps;
                                    }
                                },
                                'clicks',
                                'spend']
                        });
                });
                // TODO: Need to provide error callback for query promise as well
                $scope.summaryDateRangeSelection = dateShortCode;
            };

            $scope.dateRangeSelection = "7d";
            $scope.tabFunctions = {
                cliques: function(dateShortCode){
                    var startDate = $scope.dateRanges[dateShortCode].startDate;
                    var endDate = $scope.dateRanges[dateShortCode].endDate;
                    // query HourlyAdStats api endpoint
                    HourlyAdStat.query({
                        groupBy: 'pub_clique',
                        startDate: startDate,
                        endDate: endDate
                    }).then(function(response){
                        // build datatables options object
                        $scope.dtOptions = DTOptionsBuilder.newOptions();
                        $scope.dtOptions.withOption('paging', false);
                        $scope.dtOptions.withOption('searching', false);
                        $scope.dtOptions.withOption('scrollX', true);
                        $scope.dtOptions.withOption('order', [[1,'desc']]);
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
                publishers: function(dateShortCode){
                    var startDate = $scope.dateRanges[dateShortCode].startDate;
                    var endDate = $scope.dateRanges[dateShortCode].endDate;
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
                        $scope.dtOptions_pubs.withOption('order', [[2, 'desc']]);
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
                advertisers: function(dateShortCode){
                    var startDate = $scope.dateRanges[dateShortCode].startDate;
                    var endDate = $scope.dateRanges[dateShortCode].endDate;
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
                        $scope.dtOptions_advs.withOption('order', [[2, 'desc']]);
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
            $scope.getTabData = function(dateShortCode, tab){
                tab = tab || $scope.activeTab;
                $scope.activeTab = tab;
                $scope.tabFunctions[tab](dateShortCode);
                $scope.dateRangeSelection = dateShortCode;
            };
        }
    ]
);