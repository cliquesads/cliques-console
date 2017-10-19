/**
 * Created by bliang on 2/16/16.
 */
/* global _, angular, moment, user */
'use strict';

angular.module('publisher').directive('nativeSpecFields', ['CREATIVE_SIZES','OPENRTB','NATIVE_SPECS',
    function(CREATIVE_SIZES, OPENRTB, NATIVE_SPECS) {
        return {
            restrict: 'E',
            scope: {
                native: '=',
                errors: '=',
                onDesktopCmLoad: '&',
                onMobileCmLoad: '&',
                showActiveSwitches: '=',
                codeMirrorOptions: '='
            },
            templateUrl: 'modules/publisher/views/partials/native-spec-fields.html',
            link: function (scope, element, attrs) {
                scope.CREATIVE_SIZES = CREATIVE_SIZES;
                scope.OPENRTB = OPENRTB;
                scope.NATIVE_SPECS = NATIVE_SPECS;
            }
        };
    }
]);

