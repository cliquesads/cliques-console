angular.module('advertiser').directive('nativeCopyLong', ['NATIVE_SPECS', function(NATIVE_SPECS) {
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
            scope.rows = scope.rows || 6;
            scope.inputId = scope.index + '_description';
        }
    };
}]);
