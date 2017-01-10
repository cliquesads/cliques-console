/* global _, angular, user */
'use strict';

angular.module('advertiser').controller('AdvertiserController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog','ADVERTISER_TOOLTIPS','REVIEW_TIME', '$state',
	function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, ngDialog, ADVERTISER_TOOLTIPS, REVIEW_TIME, $state) {
        $scope.authentication = Authentication;
        $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

        /**
         * Factory for filter function used in advertiser list view
         */
        $scope.hasActiveCampaigns = function (bool){
            return function (advertiser, index, arr) {
                var hasBoolCampaigns = advertiser.campaigns.filter(function(camp){return camp.active === bool;}).length > 0;
                if (!bool){
                    hasBoolCampaigns = hasBoolCampaigns || advertiser.campaigns.length === 0;
                }
                return hasBoolCampaigns;
            };
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

        $scope.validateInput = function(name, type) {
            var input = this.advertiserForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        $scope.advertisers = Advertiser.query();

		$scope.findOne = function() {
			$scope.advertiser = Advertiser.get({
				advertiserId: $stateParams.advertiserId
			}, function(){
                HourlyAdStat.advQuery({advertiserId: $stateParams.advertiserId},{
                    groupBy: 'campaign'
                }).then(function(response){
                    response.data.forEach(function(campaign_data){
                        var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
                            return campaign._id === campaign_data._id.campaign;
                        });
                        $scope.advertiser.campaigns[i].percent_spent = (campaign_data.spend/$scope.advertiser.campaigns[i].budget).toFixed(4);
                    });
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
                controller: ['$scope',function($scope){
                    $scope.advertiser = $scope.ngDialogData.advertiser;
                    $scope.update = function() {
                        var advertiser = $scope.advertiser;
                        advertiser.$update(function() {
                            $location.path('advertiser/' + advertiser._id);
                        }, function(errorResponse) {
                            $scope.error = errorResponse.data.message;
                        });
                    };
                }],
                data: {advertiser: $scope.advertiser}
            });
        };

        $scope.newCampaign = function(){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/advertiser/views/partials/new-campaign-dialog.html',
                controller: 'NewCampaignController',
                data: {advertiser: $scope.advertiser}
            });
        };

        $scope.actionBeacons = function(){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth600',
                template: 'modules/advertiser/views/partials/actionbeacons.html',
                controller: 'actionBeaconController',
                data: {advertiser: $scope.advertiser}
            });
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