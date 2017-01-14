/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$stateParams',
    'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog','QUICKQUERIES',
    function($scope, $stateParams, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries,
             aggregationDateRanges, ngDialog, QUICKQUERIES) {
        $scope.views = null;
        $scope.quickQueries = QUICKQUERIES;
    }
]);

