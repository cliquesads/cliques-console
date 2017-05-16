angular.module('core').directive('roleSwitcher', [
    '$rootScope',
    '$state',
    'Authentication',
    function($rootScope,$state,Authentication){
        'use strict';
        return {
            restrict: 'E',
            scope: {},
            templateUrl: '/modules/core/views/partials/role-switcher.html',
            link: function(scope, element, attrs){
                scope.role = $rootScope.role || Authentication.user.organization.effectiveOrgType;
                scope.$watch('role', function(newValue, oldValue){
                    if (newValue !== oldValue && newValue){
                        $rootScope.role = newValue;
                        $state.reload();
                    }
                });
            }
        };
    }
]);
