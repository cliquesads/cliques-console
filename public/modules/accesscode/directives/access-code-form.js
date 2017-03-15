angular.module('accesscode').directive('accessCodeFormBasics', ['AccessCode','Organizations', function(AccessCode, Organizations) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            accessCode: '='
        },
        templateUrl: 'modules/accesscode/views/partials/access-code-form-basics.html',
        link: function(scope, element, attrs){}
    };
}]);