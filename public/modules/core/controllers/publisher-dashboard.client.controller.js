/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('PublisherDashboardController',
    ['$scope','$location','$window','Publisher','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication',
        function($scope, $location, $window, Publisher, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication) {

            $scope.publishers = Publisher.query();

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