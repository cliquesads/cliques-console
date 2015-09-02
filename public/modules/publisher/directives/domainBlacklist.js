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
        template: '<input type="text" tagsinput="tagsinput" data-width="100%" ng-value="ngValue" ng-model="model" placeholder="Ex: If you want to block Walmart, enter \'walmart.com\'" class="form-control" data-parsley-group="{{ wizardstep }}"/><span ng-show="invalidDomain" class="text-danger" style="">Not a valid domain name</span>',
        link: function(scope, element, attrs){
            element.on('beforeItemAdd', function(event){
                scope.invalidDomain = false;
                var valid = REGEXES.domain.test(event.item);
                if (!valid){
                    event.cancel = true;
                    scope.$apply(function(){
                        scope.invalidDomain = true;
                    });
                }
            });
            scope.ngValue = scope.model ? scope.model.join(','): '';
        }
    };
}]);
