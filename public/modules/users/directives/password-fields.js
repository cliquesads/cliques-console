angular.module('core').directive('passwordFields', ['$timeout',
    function($timeout){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                passwordModel: '=',
                verifyPasswordModel: '=',
                passwordLabel: '@',
                wizardstep: '@'
            },
            templateUrl: 'modules/users/views/partials/password-fields.html',
            link: function(scope, element, attrs){
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


