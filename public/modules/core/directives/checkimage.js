/**
 * Little directive that invokes callback function if an image tag (or really any tag)
 * throws an error
 */
angular.module('core').directive('checkImage', function() {
    "use strict";
    return {
        scope: {
            form: "=",
            fieldName: '@'
        },
        link: function(scope, element, attrs) {
            element.bind('error', function() {
                scope.form[scope.fieldName].$setValidity('isImage', false);
            });
            element.bind('load', function() {
                scope.form[scope.fieldName].$setValidity('isImage', true);
            });
        }
    };
});