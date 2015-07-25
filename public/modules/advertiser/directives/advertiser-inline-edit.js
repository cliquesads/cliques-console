angular.module('advertiser').directive('advertiserInline', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            advertiser: '=',
            onaftersave: '&'
        },
        templateUrl: 'modules/advertiser/views/partials/advertiser-inline.html'
    };
}]);