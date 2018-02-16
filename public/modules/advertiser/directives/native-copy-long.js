angular.module('advertiser').directive('nativeCopyLong', ['NATIVE_SPECS','$timeout', function(NATIVE_SPECS, $timeout) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            ngModel: '=',
            form: '=',
            rows: '@',
            wizardstep: '@',
            index: '@'
        },
        templateUrl: 'modules/advertiser/views/partials/native-copy-long.html',
        link: function(scope, element, attrs){
            scope.NATIVE_SPECS = NATIVE_SPECS;
            scope.min = 70;
            scope.max = 170;
            scope.rows = scope.rows || 6;
            scope.inputId = scope.index + '_description';
        }
    };
}]);
