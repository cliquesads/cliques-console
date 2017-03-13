/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('AdvertiserDashboardController',
    ['$scope','$location','$window','Advertiser','Publisher','DTOptionsBuilder','DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication', 'ngDialog', 'Screenshot', 'Notify',
        function($scope, $location, $window, Advertiser, Publisher, DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication, ngDialog, Screenshot, Notify) {

            $scope.isShowingAllStats = false;

            /**
             * BEGIN MY CAMPAIGN PANEL STUFF
             */
            // number of campaigns to show in "my campaigns" panel at any given time
            $scope.CAMPAIGNS_TO_SHOW = 3;
            
            $scope.allCampaigns = [];
            $scope.currentlyShowingCampaigns = [];
            $scope.showingCampaignEndIndex = 0;

            $scope.scrollUpShowingCampaigns = function() {
                if ($scope.showingCampaignEndIndex > 0) {
                    $scope.showingCampaignEndIndex --;
                    $scope.currentlyShowingCampaigns.splice(-1,1);
                    $scope.currentlyShowingCampaigns.splice(0, 0, $scope.allCampaigns[$scope.showingCampaignEndIndex - ($scope.CAMPAIGNS_TO_SHOW - 1)]);
                }
            };
            $scope.scrollDownShowingCampaigns = function() {
                if ($scope.showingCampaignEndIndex < ($scope.allCampaigns.length - 1)) {
                    $scope.showingCampaignEndIndex ++;
                    $scope.currentlyShowingCampaigns.splice(0,1);
                    $scope.currentlyShowingCampaigns.push($scope.allCampaigns[$scope.showingCampaignEndIndex]);
                }
            };

            $scope.advertiserIds = [];
            $scope.advertisers = Advertiser.query(function(advertisers){
                // after getting all advertisers, kick off request to get hourlyAdStat data as well,
                // which we will then bind to the appropriate Campaign
                HourlyAdStat.advSummaryQuery({
                    groupBy: 'campaign'
                }).then(function(response){
                    advertisers.forEach(function(adv){
                        $scope.advertiserIds.push(adv._id);
                        _.orderBy(adv.campaigns, ['active', '']);
                        adv.campaigns.forEach(function(camp){
                            camp.adv_logo_url = adv.logo_url;
                            camp.tstamp = adv.tstamp;
                            camp.parentAdvertiserId = adv._id;

                            // Bind hourlyAdStat data to campaign object
                            var data = _.find(response.data, function(d){
                                return d._id.campaign === camp._id;
                            });
                            if (data){
                                camp.percent_spent = (data.spend / camp.budget).toFixed(4);
                                camp.ctr = (data.clicks / data.imps).toFixed(4);
                            }

                            // finally, push to allCampaigns array
                            $scope.allCampaigns.push(camp);
                        });
                    });

                    // Sort all campaigns array
                    $scope.allCampaigns = _.orderBy($scope.allCampaigns, ['active','tstamp'],['desc','desc']);

                    // Now set current campaign view
                    $scope.currentlyShowingCampaigns = _.slice($scope.allCampaigns, 0, $scope.CAMPAIGNS_TO_SHOW);
                    $scope.showingCampaignEndIndex = $scope.currentlyShowingCampaigns.length - 1;
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
                HourlyAdStat.advSummaryQuery({
                    dateGroupBy: timeUnit,
                    startDate: startDate,
                    endDate: endDate
                }).then(function (response) {
                    $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                        {fields: ['imps',{'CTR': function(row){return row.clicks / row.imps;}}, 'clicks','spend', 'view_convs', 'click_convs']});
                    $scope.impressions = _.sumBy($scope.timeSeries.imps, function(item){ return item[1];});
                    $scope.clicks = _.sumBy($scope.timeSeries.clicks, function(item){ return item[1];});
                    $scope.spend = _.sumBy($scope.timeSeries.spend, function(item){ return item[1];});
                    $scope.actions = _.sumBy($scope.timeSeries.view_convs, function(item){ return item[1];}) + _.sumBy($scope.timeSeries.click_convs, function(item){ return item[1];});
                    $scope.CTR = $scope.clicks / $scope.impressions;
                });
                // TODO: Need to provide error callback for query promise as well
                $scope.summaryDateRangeSelection = dateShortCode;
            };


            /**
             * BEGIN SCREENSHOT STUFF
             */

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
    ]
);