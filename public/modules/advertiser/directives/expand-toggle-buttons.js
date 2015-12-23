angular.module('advertiser').directive('treeExpandToggleButtons', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            control: '='
        },
        templateUrl: 'modules/advertiser/views/partials/expand-toggle-buttons.html'
    };
}]);