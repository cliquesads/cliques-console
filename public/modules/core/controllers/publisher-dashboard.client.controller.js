/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('PublisherDashboardController',
    ['$scope','$location','$window','Publisher','DTOptionsBuilder','DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication','Screenshot','Notify',
    function($scope, $location, $window, Publisher, DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication, Screenshot, Notify) {
        
        $scope.isShowingAllStats = false;

        /**
         * BEGIN MY SITE PANEL STUFF
         */
        // number of sites to show in "my sites" panel at any given time
        $scope.SITES_TO_SHOW = 3;
        $scope.allSites = [];
        $scope.currentlyShowingSites = []; 
        $scope.showingSiteEndIndex = 0;

        $scope.scrollUpShowingSites = function() {
            if ($scope.showingSiteEndIndex > 0) {
                $scope.showingSiteEndIndex --;
                $scope.currentlyShowingSites.splice(-1, 1);
                $scope.currentlyShowingSites.splice(0, 0, $scope.allSites[$scope.showingSiteEndIndex - ($scope.SITES_TO_SHOW - 1)]);
            }
        };
        $scope.scrollDownShowingSites = function() {
            if ($scope.showingSiteEndIndex < ($scope.allSites.length - 1)) {
                $scope.showingSiteEndIndex ++;
                $scope.currentlyShowingSites.splice(0,1);
                $scope.currentlyShowingSites.push($scope.allSites[$scope.showingSiteEndIndex]);
            }
        };

        $scope.publisherIds = [];
        $scope.publishers = Publisher.query(function(publishers) {
            // after getting all publishers, kick off request to get hourlyAdStat data as well,
            // which we will then bind to the approriate Site
            HourlyAdStat.pubSummaryQuery({
                groupBy: 'site'
            }).then(function(response) {
                publishers.forEach(function(pub) {
                    $scope.publisherIds.push(pub._id);
                    _.orderBy(pub.sites, ['active', '']);
                    pub.sites.forEach(function(site) {
                        site.pub_logo_url = pub.logo_url;
                        site.tstamp = pub.tstamp;
                        site.parentPublisherId = pub._id;

                        // Bind hourlyAdStat data to site object
                        var data = _.find(response.data, function(d) {
                            return d._id.site === site._id;
                        });
                        if (data) {
                            site.impressions = data.Impressions;
                            site.defaults = data.Defaults;
                            site.fillRate = data['Fill Rate'];
                            site.revenue = data.Revenue;
                            site.rpm = data.RPM;
                            site.ctr = data.CTR;
                        }

                        // finally, push to allSites array
                        $scope.allSites.push(site);
                    });
                });

                // Sort all sites array
                $scope.allSites = _.orderBy($scope.allSites, ['active','tstamp'],['desc','desc']);

                // Now set current site view
                $scope.currentlyShowingSites = _.slice($scope.allSites, 0, $scope.SITES_TO_SHOW);
                $scope.showingSiteEndIndex = $scope.currentlyShowingSites.length - 1;
            });
        });

        /**
         * BEGIN QUICKSTATS STUFF
         */

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
            HourlyAdStat.pubSummaryQuery({
                dateGroupBy: timeUnit,
                startDate: startDate,
                endDate: endDate
            }).then(function (response) {
                $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                    {fields: ['imps', 'defaults', 'fillRate', 'clicks', 'spend', 'RPM', {'CTR': function(row){return row.clicks / row.imps;}}]});
                $scope.impressions = _.sumBy($scope.timeSeries.imps, function(item){ return item[1];});
                $scope.clicks = _.sumBy($scope.timeSeries.clicks, function(item){ return item[1];});
                $scope.defaults = _.sumBy($scope.timeSeries.defaults, function(item){ return item[1];});
                $scope.revenue = _.sumBy($scope.timeSeries.spend, function(item){ return item[1];});
                $scope.fillRate = $scope.impressions / ($scope.impressions + $scope.defaults);
                $scope.RPM = $scope.revenue / ($scope.impressions) * 1000;
                $scope.CTR = $scope.clicks / $scope.impressions;
            });
            // TODO: Need to provide error callback for query promise as well
            $scope.summaryDateRangeSelection = dateShortCode;
        };

        /**
         * BEGIN SCREENSHOT STUFF
         */
        $scope.demoScreenshots = [
            {
                tstamp: "2017-02-04T00:20:30.955Z",
                image_url: "https://storage.googleapis.com/cliquesads-screenshots/Mock%20Screenshot%20TGR.jpg",
                url: "http://demo-site-dot-com.com"
            },
            {
                tstamp: "2017-02-04T00:20:30.955Z",
                image_url: "https://storage.googleapis.com/cliquesads-screenshots/Skiing%20Magazine%20Mock%20Screenshot.jpg",
                url: "http://www.kafkas-fatbike.com"
            },
            {
                tstamp: "2017-02-04T00:20:30.955Z",
                image_url: "https://storage.googleapis.com/cliquesads-screenshots/Adventure%20Journal%20Mock%20Screenshot.jpg",
                url: "http://not-a-real-website.com"
            }
        ];

        Screenshot.query({}).$promise
            .then(function(response) {
                $scope.screenshots = response.models;
            }, function(errorResponse) {
                Notify.alert(errorResponse.message, {status: 'danger'});
            });

        $scope.currentlyShowingScreenshots = [];
        $scope.showingScreenshotEndIndex = 0;

        $scope.$watch('screenshots', function(newValue, oldValue, scope) {
            if ($scope.screenshots) {
                if ($scope.screenshots.length >= 3) {
                    $scope.showingScreenshotEndIndex = 2;
                    $scope.currentlyShowingScreenshots = [
                        $scope.screenshots[0],
                        $scope.screenshots[1],
                        $scope.screenshots[2]
                    ];
                } else {
                    $scope.showingScreenshotEndIndex = $scope.screenshots.length - 1;
                    $scope.currentlyShowingScreenshots = $scope.screenshots;
                }
            }
        });

        $scope.showLastScreenshot = function() {
            if ($scope.showingScreenshotEndIndex > 2) {
                $scope.showingScreenshotEndIndex --;
                $scope.currentlyShowingScreenshots = [];
                $scope.currentlyShowingScreenshots = [
                    $scope.screenshots[$scope.showingScreenshotEndIndex - 2],
                    $scope.screenshots[$scope.showingScreenshotEndIndex - 1],
                    $scope.screenshots[$scope.showingScreenshotEndIndex]
                ];
            }
        };
        $scope.showNextScreenshot = function() {
            if ($scope.showingScreenshotEndIndex < ($scope.screenshots.length - 1)) {
                $scope.showingScreenshotEndIndex ++;
                $scope.currentlyShowingScreenshots = [];
                $scope.currentlyShowingScreenshots = [
                    $scope.screenshots[$scope.showingScreenshotEndIndex - 2],
                    $scope.screenshots[$scope.showingScreenshotEndIndex - 1],
                    $scope.screenshots[$scope.showingScreenshotEndIndex]
                ];
            }
        };

    }
]);