/* global _, angular, user */
'use strict';

angular.module('advertiser').controller('AdvertiserSwitcherController', ['$scope', '$stateParams', '$location',
    '$state', '$rootScope', '$timeout', 'Authentication', 'Advertiser','ngDialog','ADVERTISER_TOOLTIPS','REVIEW_TIME',
	function($scope, $stateParams, $location, $state, $rootScope, $timeout, Authentication, Advertiser, ngDialog,
             ADVERTISER_TOOLTIPS, REVIEW_TIME) {

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

        /**
         * Factory for filter function used in advertiser list view
         */
        $scope.hasActiveCampaigns = function (bool){
            return function (advertiser, index, arr) {
                var hasBoolCampaigns = advertiser.campaigns.filter(function(camp){
                        return camp.active === true;
                    }).length > 0;
                if (!bool){
                    hasBoolCampaigns = !hasBoolCampaigns || advertiser.campaigns.length === 0;
                }
                return hasBoolCampaigns;
            };
        };

        /**
         * Set $rootScope.advertiser var to remember advertiser selection if
         * user checks checkbox, and redirect to appropriate view
         * @type {boolean}
         */
        $scope.defaults = { rememberMySelection: true };
        $scope.selectAdvertiser = function(advertiser) {
            $rootScope.advertiser = $scope.defaults.rememberMySelection ? advertiser : null;
            var nextState = $stateParams.next ? $stateParams.next : '.viewAdvertiser';
            event.preventDefault();
            $state.go(nextState, {
                advertiserId: advertiser._id
            });
        };

        /**
         * Overlay campaign helper modal if state includes necessary query params
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


        $scope.remove = function(advertiser) {
			if (advertiser) {
				advertiser.$remove();
				for (var i in $scope.advertiser) {
					if ($scope.advertiser[i] === advertiser) {
						$scope.advertiser.splice(i, 1);
					}
				}
			} else {
				$scope.advertiser.$remove(function() {
					$location.path('advertiser');
				});
			}
		};

        $scope.advertisers = Advertiser.query();

        $scope.goToCreateNewAdvertiser = function() {
            $location.path('/advertiser/create');
        };
	}
]).
controller('ListAdvertiserController',
    function($scope, $stateParams, $location, $state, $rootScope, $timeout,aggregationDateRanges,
             Authentication, Advertiser, ngDialog, ADVERTISER_TOOLTIPS, HourlyAdStat, tableSort) {

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

        $scope.headers = [
            'active',
            'advertiser',
            'name',
            'budget',
            '%_spent',
            'start_date',
            'end_date',
            'CTR',
            'CPC',
            'CPM'
        ];

        $scope.currentSorting = {
            order: 'desc'
        };

        /**
         * Sort table by specific column
         */
        $scope.sortTableBy = function(headerName){
            tableSort.sortTableBy($scope.campaigns, headerName, $scope.currentSorting);
        };

        /**
         * Get Advertisers and unpack campaigns, then get AdStats
         */
        $scope.dateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);

        /**
         *
         * @param dateShortCode
         */
        $scope.getCampaignAdStatData = function(){
            $scope.endDate = $scope.dateRanges[$scope.dateRangeSelection].endDate;
            return HourlyAdStat.advSummaryQuery({
                groupBy: 'campaign',
                startDate: $scope.earliestStartDate,
                endDate: $scope.endDate
            }).then(function(response) {
                $scope.campaignData = response.data;
                $scope.campaignDataLoading = false;
                $scope.campaigns.map(function (campaign) {
                    var adStats = _.find($scope.campaignData, function (d) {
                        return d._id.campaign === campaign._id;
                    });
                    if (!adStats){
                        adStats = {
                            imps: 0,
                            clicks: 0,
                            spend: 0
                        };
                    }
                    campaign.adStats = adStats;
                    campaign.impressions = adStats.imps;
                    campaign.spend = adStats.spend;
                    campaign.clicks = adStats.clicks;
                    campaign.CPC = adStats.clicks ? adStats.spend / adStats.clicks : 0;
                    campaign.CPM = adStats.imps ? adStats.spend / adStats.imps * 1000 : 0;
                    campaign.CTR = adStats.imps ? adStats.clicks / adStats.imps : 0;
                    campaign["%_spent"] = adStats.spend / campaign.budget;
                    return campaign;
                });
            });
        };

        /**
         * Get advertisers, flatten into campaigns array and get AdStat data on
         * controller load.
         */
        $scope.campaignsLoading = true;
        Advertiser.query().$promise.then(function(response){
            $scope.campaignsLoading = false;
            $scope.earliestStartDate = new Date();
            $scope.campaigns = _.flatMap(response, function(advertiser){
                return advertiser.campaigns.map(function(campaign){

                    // set this for query purposes to avoid running a query without
                    // a date condition against the HourlyAdStats API.
                    $scope.earliestStartDate = new Date(Math.min(new Date(campaign.start_date), $scope.earliestStartDate));

                    // set advertiser metadata on Campaign row object
                    campaign.logo_secure_url = advertiser.logo_secure_url;
                    campaign.advertiser = advertiser.name;
                    campaign._advertiser = advertiser;
                    return campaign;
                });
            });
            $scope.campaignDataLoading = true;
        }).then(function() {
            return $scope.getCampaignAdStatData($scope.dateRangeSelection);
        }).catch(function(err){
            console.log(err);
        });

        $scope.goToCreateNewAdvertiser = function() {
            $location.path('/advertiser/create');
        };

        $scope.activeFilter = true;
    }
).
controller('AdvertiserController', ['$scope', '$stateParams', '$location',
        'Authentication', 'Advertiser','advertiser','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog',
        'ADVERTISER_TOOLTIPS','REVIEW_TIME', '$state', '$rootScope',
        function($scope, $stateParams, $location, Authentication, Advertiser, advertiser, HourlyAdStat, MongoTimeSeries,
                 aggregationDateRanges, ngDialog, ADVERTISER_TOOLTIPS, REVIEW_TIME, $state) {

            $scope.authentication = Authentication;
            $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

            $scope.advertiser = advertiser;

            $scope.findOne = function() {
                HourlyAdStat.advQuery({advertiserId: $stateParams.advertiserId},{
                    groupBy: 'campaign'
                }).then(function(response){
                    response.data.forEach(function(campaign_data){
                        var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
                            return campaign._id === campaign_data._id.campaign;
                        });
                        $scope.advertiser.campaigns[i].percent_spent =
                            (campaign_data.spend/$scope.advertiser.campaigns[i].budget).toFixed(4);
                    });
                });
            };

            $scope.update = function() {
                var advertiser = $scope.advertiser;
                advertiser.$update(function() {
                    $location.path('advertiser/' + advertiser._id);
                }, function(errorResponse) {
                    $scope.error = errorResponse.data.message;
                });
            };

            $scope.advertiserBasics = function(){
                ngDialog.open({
                    template: 'modules/advertiser/views/partials/advertiser-inline.html',
                    controller: ['$scope','$location','SalesPerson','Notify', function($scope, $location, SalesPerson, Notify){
                        $scope.advertiser = $scope.ngDialogData.advertiser;
                        SalesPerson.query({ perPage: 50000 }).$promise.then(function(results){
                            $scope.salespeople = results.results;
                        });
                        $scope.update = function() {
                            if ($scope.advertiserBasicsForm.$valid){
                                var advertiser = $scope.advertiser;
                                advertiser.$update(function() {
                                    Notify.alert('Advertiser details successfully updated', {status: 'success'});
                                    $scope.closeThisDialog(0);
                                }, function(errorResponse) {
                                    Notify.alert('Error saving advertiser: ' + errorResponse.message, {status: 'danger'});
                                });
                            }
                        };
                    }],
                    data: {advertiser: $scope.advertiser}
                });
            };

            $scope.newCampaign = function(){
                $state.go('app.advertiser.allAdvertisers.viewAdvertiser.createNewCampaign', {advertiser: $scope.advertiser});
            };

            // ######################################### //
            // ######### GRAPH VARS & FUNCTIONS ######## //
            // ######################################### //

            // See service in aggregations module for details on aggregationDateRanges object
            $scope.dateRangeSelection = "7d";
            $scope.dateRanges = aggregationDateRanges(user.tz);

            $scope.getAdvertiserGraph = function(dateShortCode){
                dateShortCode = dateShortCode || $scope.dateRangeSelection;
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;

                // Pass "show-points" to graph directive to toggle line points
                // Only have this so points won't show for lines with tons of data
                $scope.showPoints = $scope.dateRanges[dateShortCode].showPoints;

                // For grouping & MongoTimeSeries generation
                var timeUnit = 'day';

                // query HourlyAdStats api endpoint
                HourlyAdStat.advQuery({advertiserId: $stateParams.advertiserId},{
                    dateGroupBy: timeUnit,
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
                    $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                        {fields: ['imps',{'CTR': function(row){return row.clicks / row.imps;}}, 'clicks','spend']});
                    $scope.impressions = _.sumBy($scope.timeSeries.imps, function(item){ return item[1];});
                    $scope.clicks = _.sumBy($scope.timeSeries.clicks, function(item){ return item[1];});
                    $scope.spend = _.sumBy($scope.timeSeries.spend, function(item){ return item[1];});
                    $scope.CTR = $scope.clicks / $scope.impressions;
                });
                // TODO: Need to provide error callback for query promise as well

                $scope.dateRangeSelection = dateShortCode;
            };
        }
    ]);