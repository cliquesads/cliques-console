/**
 * Created by bliang on 8/21/15.
 */
angular.module('core').controller('AdvertiserDashboardController',
    ['$scope','$location','$window','Advertiser','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication',
        function($scope, $location, $window, Advertiser, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication) {

            $scope.advertisers = Advertiser.query();
            var k;

            //var adStats = HourlyAdStat.advQuery({},{
            //    groupBy: 'campaign'
            //}).then(function(response){
            //    response.data.forEach(function(campaign_data){
            //        var i = _.findIndex($scope.advertiser.campaigns, function(campaign){
            //            return campaign._id === campaign_data._id.campaign
            //        });
            //        $scope.advertiser.campaigns[i].percent_spent = (campaign_data.spend
            //        / $scope.advertiser.campaigns[i].budget).toFixed(4);
            //    });
            //});
        }
    ]
);