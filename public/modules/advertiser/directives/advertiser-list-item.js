angular.module('advertiser').directive('advertiserListItem', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            advertiser: '='
        },
        templateUrl: 'modules/advertiser/views/partials/advertiser-list-item.html',
        link: function(scope, element, attrs){}
    };
}]);
