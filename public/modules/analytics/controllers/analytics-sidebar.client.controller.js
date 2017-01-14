/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsSidebarController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog', '$state',
    function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries,
             aggregationDateRanges, ngDialog, $state) {
        $scope.views = null;
    }
]);
