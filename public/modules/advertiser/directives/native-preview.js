angular.module('advertiser').directive('nativePreview', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            advertiser: '=',
            creative: '='
        },
        templateUrl: 'modules/advertiser/views/partials/native-preview.html'
    };
}]);