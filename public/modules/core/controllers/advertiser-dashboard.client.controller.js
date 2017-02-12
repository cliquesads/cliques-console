/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('AdvertiserDashboardController',
    ['$scope','$location','$window','Advertiser','Publisher','DTOptionsBuilder','DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication', 'ngDialog', 'ScreenshotFetcher', 'Notify',
        function($scope, $location, $window, Advertiser, Publisher, DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication, ngDialog, ScreenshotFetcher, Notify) {

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
                ScreenshotFetcher.fetchByAdvertiserIds($scope.advertiserIds)
                .then(function(response) {
                    $scope.screenshots = response.data;
                }, function(errorResponse) {
                    Notify.alert(errorResponse.data.message, {status: 'danger'});
                });
            });

            HourlyAdStat.advSummaryQuery({}).then(function(response){
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
                HourlyAdStat.advSummaryQuery({
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

            $scope.getDashboardGraph('30d');


            $scope.dateRangeSelection = "7d";
            $scope.tabFunctions = {
                publishers: function(dateShortCode){
                    var startDate = $scope.dateRanges[dateShortCode].startDate;
                    var endDate = $scope.dateRanges[dateShortCode].endDate;
                    // query HourlyAdStats api endpoint
                    HourlyAdStat.advSummaryQuery({
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
                    HourlyAdStat.advSummaryQuery({
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
            $scope.activeTab = 'publishers';
            $scope.getTabData = function(dateShortCode, tab){
                tab = tab || $scope.activeTab;
                $scope.activeTab = tab;
                $scope.tabFunctions[tab](dateShortCode);
                $scope.dateRangeSelection = dateShortCode;
            };

            $scope.showMoreStats = function(){
                $scope.isShowingAllStats = true;
            };
            $scope.hideMoreStats = function() {
                $scope.isShowingAllStats = false;
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

            $scope.viewScreenshot = function(screenshot){
                ngDialog.open({
                    template: 'modules/core/views/partials/screenshot-dialog.html',
                    data: { screenshotUrl: screenshot.image_url },
                    className: 'ngdialog-theme-default dialogwidth800'
                });
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
                        $scope.screenshots[$scope.showingScreenshotEndIndex],
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
                        $scope.screenshots[$scope.showingScreenshotEndIndex],
                    ];
                }
            };
        }
    ]
);