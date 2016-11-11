'use strict';

angular.module('core').directive('statusLabel', [function(){
        return {
            restrict: 'E',
            scope: {
                model: '='
            },
            template: '<div class="label" ng-class="model.active ? \'label-success\':\'label-default\'">{{ model.active ? "Active":"Inactive"}}</div>',
            link:
                function (scope, element, attrs) {}
        };
    }
]);