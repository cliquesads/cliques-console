/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('AdvertiserDashboardController',
    ['$scope','$location','$window','Advertiser','Publisher','DTOptionsBuilder','DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication', 'ngDialog', 'Screenshot', 'Notify',
        function($scope, $location, $window, Advertiser, Publisher, DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication, ngDialog, Screenshot, Notify) {

            $scope.isShowingAllStats = false;

            $scope.allCampaigns = [];
            $scope.currentlyShowingCampaigns = [];
            $scope.showingCampaignEndIndex = 0;

            $scope.creatives = [];
            $scope.advertiserIds = [];
            $scope.advertisers = Advertiser.query(function(advertisers){
                advertisers.forEach(function(adv){
                    $scope.advertiserIds.push(adv._id);
                    adv.campaigns.forEach(function(camp){
                        camp.adv_logo_url = adv.logo_url;
                        camp.parentAdvertiserId = adv._id;
                        $scope.allCampaigns.push(camp);
                        if ($scope.currentlyShowingCampaigns.length < 2) {
                            $scope.currentlyShowingCampaigns.push(camp);
                        }
                        $scope.showingCampaignEndIndex = $scope.currentlyShowingCampaigns.length - 1;
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
                Screenshot.query({}).$promise
                .then(function(response) {
                    $scope.screenshots = response.models;
                }, function(errorResponse) {
                    Notify.alert(errorResponse.message, {status: 'danger'});
                });
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


            $scope.scrollUpShowingCampaigns = function() {
                if ($scope.showingCampaignEndIndex > 0) {
                    $scope.showingCampaignEndIndex --; 
                    $scope.currentlyShowingCampaigns = [];
                    $scope.currentlyShowingCampaigns.push($scope.allCampaigns[$scope.showingCampaignEndIndex - 1]);
                    $scope.currentlyShowingCampaigns.push($scope.allCampaigns[$scope.showingCampaignEndIndex]);
                }
            };
            $scope.scrollDownShowingCampaigns = function() {
                if ($scope.showingCampaignEndIndex < ($scope.allCampaigns.length - 1)) {
                    $scope.showingCampaignEndIndex ++; 
                    $scope.currentlyShowingCampaigns = [];
                    $scope.currentlyShowingCampaigns.push($scope.allCampaigns[$scope.showingCampaignEndIndex - 1]);
                    $scope.currentlyShowingCampaigns.push($scope.allCampaigns[$scope.showingCampaignEndIndex]);
                }
            };

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