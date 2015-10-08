/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('CampaignController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','CampaignActivator','Notify', 'DTOptionsBuilder', 'DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog',
	function($scope, $stateParams, $location, Authentication, Advertiser, CampaignActivator, Notify, DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges,ngDialog) {
		$scope.authentication = Authentication;
        // Set mins & maxes
        $scope.min_base_bid = 1;
        $scope.max_base_bid = 20;

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

        $scope.advertisers = Advertiser.query();

		$scope.update = function() {
			var advertiser = $scope.advertiser;

			advertiser.$update(function(){}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};
		$scope.findOne = function() {
			Advertiser.get({advertiserId: $stateParams.advertiserId})
                .$promise
                .then(function(advertiser){
                    $scope.advertiser = advertiser;
                    var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
                        return campaign._id === $stateParams.campaignId;
                    });
                    //$scope.campaign as pointer to campaign in advertiser.campaigns array
                    //this way, all Advertiser resource methods will work
                    $scope.campaign = $scope.advertiser.campaigns[i];
                });
		};

        // Listener to update quickstats when advertiser var changes
        $scope.$watch(function(scope){ return scope.advertiser; }, function(newAdv, oldAdv){
            if (newAdv){
                HourlyAdStat.advQuery({advertiserId: newAdv._id},{
                    groupBy: 'campaign'
                }).then(function(response){
                    response.data.forEach(function(campaign_data){
                        var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
                            return campaign._id === campaign_data._id.campaign;
                        });
                        // augment campaign w/ campaign quickstats
                        $scope.advertiser.campaigns[i].percent_spent = (campaign_data.spend/ $scope.advertiser.campaigns[i].budget).toFixed(4);
                        $scope.advertiser.campaigns[i].imps = campaign_data.imps;
                        $scope.advertiser.campaigns[i].clicks = campaign_data.clicks;
                        $scope.advertiser.campaigns[i].ctr = (campaign_data.clicks / campaign_data.imps).toFixed(4);
                        $scope.advertiser.campaigns[i].spend = campaign_data.spend;
                        $scope.advertiser.campaigns[i].ecpm = ((campaign_data.spend / campaign_data.imps) * 1000).toFixed(4);
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

        // ######################################### //
        // ######### GRAPH VARS & FUNCTIONS ######## //
        // ######################################### //

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
                    $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                        {fields: ['imps',{'CTR': function(row){return row.clicks / row.imps;}}, 'clicks','spend', 'view_convs', 'click_convs']});
                    $scope.impressions = _.sum($scope.timeSeries.imps, function(item){ return item[1];});
                    $scope.clicks = _.sum($scope.timeSeries.clicks, function(item){ return item[1];});
                    $scope.spend = _.sum($scope.timeSeries.spend, function(item){ return item[1];});
                    $scope.actions = _.sum($scope.timeSeries.view_convs, function(item){ return item[1];}) + _.sum($scope.timeSeries.click_convs, function(item){ return item[1];});
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
                    // build datatables options object
                    $scope.dtOptions = DTOptionsBuilder.newOptions();
                    $scope.dtOptions.withOption('paging', false);
                    $scope.dtOptions.withOption('searching', false);
                    $scope.dtOptions.withOption('scrollX', true);
                    $scope.dtOptions.withOption('order', [[3,'desc']]);
                    // Not entirely sure if this is necessary
                    $scope.dtColumnDefs = [
                        DTColumnDefBuilder.newColumnDef(0),
                        DTColumnDefBuilder.newColumnDef(1),
                        DTColumnDefBuilder.newColumnDef(2),
                        DTColumnDefBuilder.newColumnDef(3),
                        DTColumnDefBuilder.newColumnDef(4),
                        DTColumnDefBuilder.newColumnDef(5)
                    ];
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
                    // build datatables options object
                    $scope.dtOptions_site = DTOptionsBuilder.newOptions();
                    $scope.dtOptions_site.withOption('paging', false);
                    $scope.dtOptions_site.withOption('searching', false);
                    $scope.dtOptions_site.withOption('scrollX', true);
                    $scope.dtOptions_site.withOption('order', [[2,'desc']]);
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