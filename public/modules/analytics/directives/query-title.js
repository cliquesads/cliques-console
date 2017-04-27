/* global _, angular, user */
angular.module('analytics').directive('queryTitle', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            queryParam: "=",
            humanizedDateRange: "=",
            tz: "@"
        },
        templateUrl: 'modules/analytics/views/partials/query-title.html',
        link: function(scope, element, attrs) {
        }
    };
}]);