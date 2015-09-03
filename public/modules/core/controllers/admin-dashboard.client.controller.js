/**
 * Created by bliang on 8/21/15.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('AdminDashboardController',
    ['$scope','$location','$window','Advertiser','Publisher','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','Authentication',
        function($scope, $location, $window, Advertiser, Publisher,HourlyAdStat, MongoTimeSeries, aggregationDateRanges, Authentication) {
            $scope.advertisers = Advertiser.query();
            $scope.publishers = Publisher.query();
            HourlyAdStat.query({}).then(function(response){
                $scope.adStats = response.data;
            });
        }
    ]
);