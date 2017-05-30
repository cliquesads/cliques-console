angular.module('advertiser').directive('nativeCopyShort', ['NATIVE_SPECS', function(NATIVE_SPECS) {
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
        templateUrl: 'modules/advertiser/views/partials/native-copy-short.html',
        link: function(scope, element, attrs){
            scope.NATIVE_SPECS = NATIVE_SPECS;
            scope.rows = scope.rows || 6;
            scope.inputId = scope.index + '_headline';
            scope.nativeModel = scope.ngModel.file ? scope.ngModel : scope.ngModel.native;
        }
    };
}]);
