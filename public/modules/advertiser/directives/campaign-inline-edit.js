angular.module('advertiser').directive('campaignInline', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            campaign: '=',
            onaftersave: '&'
        },
        templateUrl: 'modules/advertiser/views/partials/campaign-inline.html'
    };
}]);