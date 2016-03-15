angular.module('core').directive('passwordFields', ['$timeout',
    function($timeout){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                passwordModel: '=',
                verifyPasswordModel: '=',
                passwordLabel: '@',
                wizardstep: '@',
                layout: '@'
            },
            templateUrl: 'modules/users/views/partials/password-fields.html',
            link: function(scope, element, attrs){
                // Layout can either be 'horizontal' or 'vertical'
                scope.layout = scope.layout || 'horizontal';
                /**
                 * Terrible jQuery hack to move password helpers to where I want them to go
                 */
                $timeout(function(){
                    $('section.trustpass').appendTo('#password-helper');
                });
            }
        };
    }
]);


