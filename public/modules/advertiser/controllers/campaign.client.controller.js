'use strict';

angular.module('advertiser').controller('CampaignController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries','aggregationDateRanges',
	function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges) {
		$scope.authentication = Authentication;

        //if ($stateParams.advertiserId != '_') {
        //    $scope.advertiser = Advertiser.get({
        //        advertiserId: $stateParams.advertiserId
        //    });
        //}
        $scope.validateInput = function(name, type) {
            var input = this.campaignForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };
        $scope.findAdvertisers = function() {
            // on query return, get campaign spend data to augment $scope.advertisers
            $scope.advertisers = Advertiser.query();
        };
		$scope.update = function() {
			var advertiser = $scope.advertiser;

			advertiser.$update(function() {
				$location.path('advertiser/' + advertiser._id);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};
		$scope.findOne = function() {
			Advertiser.get({advertiserId: $stateParams.advertiserId})
                .$promise
                .then(function(advertiser){
                    $scope.advertiser = advertiser;
                    $scope.campaign = advertiser.campaigns.filter(function(camp, ind, arr){
                        return camp._id == $stateParams.campaignId; }
                    )[0];
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
                $scope.impressions = _.sum($scope.timeSeries.imps, function(item){ return item[1]});
                $scope.clicks = _.sum($scope.timeSeries.clicks, function(item){ return item[1]});
                $scope.spend = _.sum($scope.timeSeries.spend, function(item){ return item[1]});
                $scope.CTR = $scope.clicks / $scope.impressions;
            });
            // TODO: Need to provide error callback for query promise as well

            $scope.dateRangeSelection = dateShortCode;
        }
	}
]);