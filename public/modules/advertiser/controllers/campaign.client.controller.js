/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('CampaignController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','Campaign','CampaignActivator','Notify', 'DTOptionsBuilder',
    'DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog',
    'REVIEW_TIME',
	function($scope, $stateParams, $location, Authentication, Advertiser, Campaign, CampaignActivator, Notify,
             DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges,ngDialog,
             REVIEW_TIME) {

		$scope.authentication = Authentication;
        // Set mins & maxes
        $scope.min_base_bid = 1;
        $scope.max_base_bid = 20;

        /**
         * Overlap campaign helper modal if state includes necessary query params
         */
        $scope.newModal = function(){
            ngDialog.open({
                template: 'modules/advertiser/views/partials/new-campaign-helper-modal.html',
                data: { review_time: REVIEW_TIME }
            });
        };
        // this activates the modal
        $scope.showNewModal = function(){
            if ($location.search().newModal){
                $scope.newModal();
            }
        };

        $scope.toggleCampaignActive = function(){
            if (!this.campaign.active){
                CampaignActivator.deactivate({
                    advertiserId: $stateParams.advertiserId,
                    campaignId: $stateParams.campaignId
                }).then(function(response){
                    Notify.alert('Your campaign was successfully deactivated.',{});
                }, function(errorResponse){
                    Notify.alert('Error deactivating campaign: ' + errorResponse.message,{status: 'danger'});
                });
            } else {
                CampaignActivator.activate({
                    advertiserId: $stateParams.advertiserId,
                    campaignId: $stateParams.campaignId
                }).then(function(response){
                    Notify.alert('Your campaign was successfully activated. Let\'s do this thing.',{});
                }, function(errorResponse){
                    Notify.alert('Error activating campaign: ' + errorResponse.message,{status: 'danger'});
                });
            }
        };

        $scope.validateInput = function(name, type) {
            var input = this.campaignForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

		$scope.findOne = function() {
            Campaign.fromStateParams($stateParams, function(err, advertiser, campaignIndex) {
                $scope.advertiser = advertiser;
                $scope.campaignIndex = campaignIndex;
                $scope.campaign = $scope.advertiser.campaigns[campaignIndex];
            });
		};

        $scope.update = function() {
            $scope.advertiser.$update(function(){
                $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
            }, function(errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };

        // TODO: This is only being used in listCampaigns view, deprecate this eventually or move to
        // TODO: separate controller.
        $scope.$watch(function(scope){ return scope.selectedAdvertiser; }, function(newAdv, oldAdv){
            if (newAdv){
                HourlyAdStat.advQuery({advertiserId: newAdv._id},{
                    groupBy: 'campaign'
                }).then(function(response){
                    response.data.forEach(function(campaign_data){
                        var i = _.findIndex($scope.selectedAdvertiser.campaigns, function(campaign){
                            return campaign._id === campaign_data._id.campaign;
                        });
                        // augment campaign w/ campaign quickstats
                        $scope.selectedAdvertiser.campaigns[i].percent_spent = (campaign_data.spend/ $scope.selectedAdvertiser.campaigns[i].budget).toFixed(4);
                        $scope.selectedAdvertiser.campaigns[i].imps = campaign_data.imps;
                        $scope.selectedAdvertiser.campaigns[i].clicks = campaign_data.clicks;
                        $scope.selectedAdvertiser.campaigns[i].ctr = (campaign_data.clicks / campaign_data.imps).toFixed(4);
                        $scope.selectedAdvertiser.campaigns[i].spend = campaign_data.spend;
                        $scope.selectedAdvertiser.campaigns[i].ecpm = ((campaign_data.spend / campaign_data.imps) * 1000).toFixed(4);
                    });
                });
            }
        });

        // ######################################### //
        // ######### EDIT DIALOG HANDLERS ########## //
        // ######################################### //
        $scope.editDMATargets = function(){
            ngDialog.open({
                template: 'modules/advertiser/views/partials/dma-targets.html',
                controller: 'dmaTargetsController',
                data: {advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
        };
        $scope.editCreatives = function(){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/advertiser/views/partials/edit-creatives.html',
                controller: 'editCreativesController',
                data: {advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
        };

        $scope.editPlacementTargets = function(){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth650',
                template: 'modules/advertiser/views/partials/placement-targets.html',
                controller: 'placementTargetsController',
                data: {advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
        };

        $scope.creativePreview = function(creative){
            var dialogClass = 'dialogwidth800';
            if (creative.w >= 800) {
                dialogClass = 'dialogwidth1000';
            }
            ngDialog.open({
                className: 'ngdialog-theme-default ' + dialogClass,
                template: 'modules/advertiser/views/partials/creative-preview.html',
                controller: 'creativePreviewController',
                data: {creative: creative, advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
        };

        // ######################################### //
        // ######### GRAPH VARS & FUNCTIONS ######## //
        // ######################################### //

        // build datatables options object
        $scope.dtOptions_site = DTOptionsBuilder.newOptions();
        $scope.dtOptions_site.withOption('paging', false);
        $scope.dtOptions_site.withOption('searching', false);
        $scope.dtOptions_site.withOption('scrollX', true);
        $scope.dtOptions_site.withOption('order', [[2,'desc']]);
        $scope.dtOptions_site.withBootstrap();
        // Not entirely sure if this is necessary
        $scope.dtColumnDefs_site = [
            DTColumnDefBuilder.newColumnDef(0),
            DTColumnDefBuilder.newColumnDef(1),
            DTColumnDefBuilder.newColumnDef(2),
            DTColumnDefBuilder.newColumnDef(3),
            DTColumnDefBuilder.newColumnDef(4),
            DTColumnDefBuilder.newColumnDef(5),
            DTColumnDefBuilder.newColumnDef(6)
        ];

        // build datatables options object
        $scope.dtOptions = DTOptionsBuilder.newOptions();
        $scope.dtOptions.withOption('paging', false);
        $scope.dtOptions.withOption('searching', false);
        $scope.dtOptions.withOption('scrollX', true);
        $scope.dtOptions.withOption('order', [[3,'desc']]);
        $scope.dtOptions.withBootstrap();

        // Not entirely sure if this is necessary
        $scope.dtColumnDefs = [
            DTColumnDefBuilder.newColumnDef(0),
            DTColumnDefBuilder.newColumnDef(1),
            DTColumnDefBuilder.newColumnDef(2),
            DTColumnDefBuilder.newColumnDef(3),
            DTColumnDefBuilder.newColumnDef(4),
            DTColumnDefBuilder.newColumnDef(5)
        ];


        // See service in aggregations module for details on aggregationDateRanges object
        $scope.dateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.tabFunctions = {
            summary: function(dateShortCode){
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;
                // Pass "show-points" to graph directive to toggle line points
                // Only have this so points won't show for lines with tons of data
                $scope.showPoints = $scope.dateRanges[dateShortCode].showPoints;
                // For grouping & MongoTimeSeries generation
                var timeUnit = 'day';
                // query HourlyAdStats api endpoint
                HourlyAdStat.advQuery({
                    advertiserId: $stateParams.advertiserId,
                    campaignId: $stateParams.campaignId
                },{
                    dateGroupBy: timeUnit,
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
                    $scope.campaignTimeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                        {fields: ['imps',{'CTR': function(row){return row.clicks / row.imps;}}, 'clicks','spend', 'view_convs', 'click_convs']});
                    $scope.impressions = _.sumBy($scope.campaignTimeSeries.imps, function(item){ return item[1];});
                    $scope.clicks = _.sumBy($scope.campaignTimeSeries.clicks, function(item){ return item[1];});
                    $scope.spend = _.sumBy($scope.campaignTimeSeries.spend, function(item){ return item[1];});
                    $scope.actions = _.sumBy($scope.campaignTimeSeries.view_convs, function(item){ return item[1];}) + _.sumBy($scope.campaignTimeSeries.click_convs, function(item){ return item[1];});
                    $scope.CTR = $scope.clicks / $scope.impressions;
                });
                // TODO: Need to provide error callback for query promise as well
            },
            creatives: function(dateShortCode){
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;
                // query HourlyAdStats api endpoint
                HourlyAdStat.advQuery({
                    advertiserId: $stateParams.advertiserId,
                    campaignId: $stateParams.campaignId
                },{
                    groupBy: 'creative',
                    populate: 'creative',
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
                    $scope.creativeData = response.data;
                }, function(err){
                    console.log(err);
                });
            },
            sites: function(dateShortCode){
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;
                // query HourlyAdStats api endpoint
                HourlyAdStat.advQuery({
                    advertiserId: $stateParams.advertiserId,
                    campaignId: $stateParams.campaignId
                },{
                    groupBy: 'publisher,site',
                    populate: 'site',
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
                    $scope.siteData = response.data;
                }, function(err){
                    console.log(err);
                });
            }
        };
        $scope.activeTab = 'summary';
        $scope.getTabData = function(dateShortCode, tab){
            tab = tab || $scope.activeTab;
            $scope.activeTab = tab;
            $scope.tabFunctions[tab](dateShortCode);
            $scope.dateRangeSelection = dateShortCode;
        };
	}
]);