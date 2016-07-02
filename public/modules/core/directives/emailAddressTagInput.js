angular.module('core').directive('emailAddressTagsInput', ['REGEXES',function(REGEXES) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            ngModel: '=',
            wizardstep: '@'
        },
        template: '<input type="text" tagsinput="tagsinput" data-width="100%" ng-value="ngValue" ng-model="ngModel" placeholder="fred@gmail.com" class="form-control"/><span ng-show="invalidEmail" class="text-danger" style="">Not a valid email</span>',
        link: function(scope, element, attrs){
            element.on('beforeItemAdd', function(event){
                scope.invalidEmail = false;
                var valid = REGEXES.email.test(event.item);
                if (!valid){
                    event.cancel = true;
                    scope.$apply(function(){
                        scope.invalidEmail = true;
                    });
                }
            });
            
            //TODO: This is broken, does not bind to model value properly!
            scope.$watch('ngModel',function(newVal){
                scope.ngModel = newVal;
                scope.ngValue = scope.model ? scope.model.join(','): '';
            });

        }
    };
}]);
