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
                // TODO: The onLoad listeners don't work inside of custom directives, no idea
                // TODO: why. Seems to be an issue with access to directive scope from ui-codemirror directive.
                // TODO: In the meantime I've written an awful hack so the caller can access CodeMirror instances

                // scope.onDesktopCmLoadTest = function(_editor){
                //     scope.onDesktopCmLoad({ _editor: _editor });
                // };
                // scope.onMobileCmLoadTest = function(_editor){
                //     scope.onMobileCmLoad({ _editor: _editor });
                // };

                // If you're reading this, I'm really sorry
                // Obviously if DOM structure is changed in template, this will need to be updated.
                scope.desktopCodeMirror = element[0].children[1].children[2].children[0].children[0].CodeMirror;

                // If you're reading this, I'm really sorry
                // Obviously if DOM structure is changed in template, this will need to be updated.
                scope.mobileCodeMirror = element[0].children[2].children[2].children[0].children[0].CodeMirror;

                if (scope.onDesktopCmLoad){
                    scope.onDesktopCmLoad({ codeMirror : scope.desktopCodeMirror });
                }

                if (scope.onMobileCmLoad){
                    scope.onMobileCmLoad({ codeMirror : scope.mobileCodeMirror });
                }

                scope.CREATIVE_SIZES = CREATIVE_SIZES;
                scope.OPENRTB = OPENRTB;
                scope.NATIVE_SPECS = NATIVE_SPECS;
            }
        };
    }
]);

