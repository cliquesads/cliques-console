/**
 * Created by bliang on 8/27/15.
 */
angular.module('publisher').directive('domainBlacklist', ['REGEXES',function(REGEXES) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            model: '=',
            wizardstep: '@'
        },
        template: '<input type="text" tagsinput="tagsinput" ng-value="ngValue" ng-model="model" class="form-control" data-parsley-group="{{ wizardstep }}"/>',
        link: function(scope, element, attrs){
            element.on('beforeItemAdd', function(event){
                var valid = REGEXES.domain.test(event.item);
                if (!valid){
                    event.cancel = true;
                }
            });
            scope.ngValue = scope.model.join(',');
        }
    };
}]);
