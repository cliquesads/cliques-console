/* global _, angular, moment, user, deploymentMode */
'use strict';

angular.module('advertiser').controller('CampaignController', ['$scope', '$stateParams', '$location',
    '$timeout','Authentication', 'Advertiser','campaign','CampaignActivator','Notify', 'DTOptionsBuilder',
    'DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog',
    'REVIEW_TIME','ADVERTISER_TOOLTIPS','CLIQUE_ICON_CLASSES','BID_SETTINGS',
	function($scope, $stateParams, $location, $timeout, Authentication, Advertiser, campaign, CampaignActivator, Notify,
             DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges,ngDialog,
             REVIEW_TIME, ADVERTISER_TOOLTIPS,CLIQUE_ICON_CLASSES,BID_SETTINGS) {

        $scope.advertiser = campaign.advertiser;
        $scope.campaignIndex = campaign.index;
        $scope.campaign = campaign.campaign;
        $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;
        $scope.CLIQUE_ICON_CLASSES = CLIQUE_ICON_CLASSES;
        $scope.deploymentMode = deploymentMode;

		$scope.authentication = Authentication;
        // Set mins & maxes
        $scope.min_base_bid = BID_SETTINGS.min_base_bid;
        $scope.max_base_bid = BID_SETTINGS.max_base_bid;

        $scope.saveCampaignFrequency = function() {
            $scope.advertiser.$update(function(){
                $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
            }, function(errorResponse) {
                $scope.error = errorResponse.data.message;
            }); 
        };

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

        $scope.toggleMultiBid = function(){
            $scope.advertiser.$update(function(){
                Notify.alert('Multi-Bid setting changed.',{});
                $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
            }, function(errorResponse) {
                Notify.alert('Error deactivating Multi-Bid: ' + errorResponse.message,{status: 'danger'});
                $scope.error = errorResponse.data.message;
            });
        };

        $scope.toggleEvenPacing = function(){

            // Wrap $update promise in dialog promise, which has to be resolved
            // first by clicking "Confirm"
            var toggle = function(){
                $scope.advertiser.$update(function(){
                    Notify.alert('Even-pacing setting changed.',{status: 'success'});
                    $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                }, function(errorResponse) {
                    Notify.alert('Error changing even pacing: ' + errorResponse.message,{status: 'danger'});
                    $scope.error = errorResponse.data.message;
                });
            };
            if (!$scope.campaign.even_pacing){
                var dialog = ngDialog.openConfirm({
                    template: '\
                        <br>\
                        <p>Are you SURE you want to disable even pacing? Your campaign\'s budget will be spent as \
                        quickly as possible with even pacing disabled.</p>\
                        <p class="text-center">\
                            <button class="btn btn-lg btn-success" ng-click="confirm(true)">Yes</button>\
                            <button class="btn btn-lg btn-default" ng-click="confirm(false)">No</button>\
                        </p>',
                    plain: true
                });
                dialog.then(function(doIt) {
                    if (doIt){
                        toggle();
                    } else {
                        $scope.campaign.even_pacing = true;
                    }
                });
            } else {
                toggle();
            }
        };

        $scope.validateInput = function(name, type) {
            var input = this.campaignForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        $scope.update = function() {
            $scope.advertiser.$update(function(){
                $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
            }, function(errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };

        // ######################################### //
        // ######### EDIT DIALOG HANDLERS ########## //
        // ######################################### //
        $scope.addNewCreatives = function(){
            var dialog = ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth1200',
                template: 'modules/advertiser/views/partials/upload-creatives.html',
                controller: 'uploadCreativesController',
                data: {advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
            dialog.closePromise.then(function(data){
                if (data.value === "Success"){
                    $timeout(function(){
                        $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                    },100);
                }
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
                    $scope.actions = _.sumBy($scope.campaignTimeSeries.view_convs, function(item){ return item[1];}) +
                        _.sumBy($scope.campaignTimeSeries.click_convs, function(item){ return item[1];});
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