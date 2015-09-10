/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('AdminDashboardController',
    ['$scope','$location','$window','Advertiser','Publisher','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication',
        function($scope, $location, $window, Advertiser, Publisher,HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication) {
            $scope.advertisers = Advertiser.query();
            $scope.publishers = Publisher.query();
            HourlyAdStat.query({}).then(function(response){
                $scope.adStats = response.data;
            });

            // See service in aggregations module for details on aggregationDateRanges object
            $scope.dateRangeSelection = "7d";
            $scope.dateRanges = aggregationDateRanges(user.tz);

            $scope.getDashboardGraph = function(dateShortCode) {
                dateShortCode = dateShortCode || $scope.dateRangeSelection;
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
                            fields: ['imps', {
                                'CTR': function (row) {
                                    return row.clicks / row.imps;
                                }
                            }, 'clicks', 'spend']
                        });
                });
                // TODO: Need to provide error callback for query promise as well

                $scope.dateRangeSelection = dateShortCode;
            }
        }
    ]
);