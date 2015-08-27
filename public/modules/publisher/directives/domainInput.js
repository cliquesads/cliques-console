/**
 * Created by bliang on 8/27/15.
 */
angular.module('publisher').directive('domainInput', ['REGEXES',function(REGEXES) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            model: '=',
            wizardstep: '@',
            required: '@'
        },
        template: '<input name="domain_name" type="text" data-ng-model="model" id="domain_name" data-parsley-group="step2" class="form-control" placeholder="http://www.example.com" required="{{ required }}">',
        link: function(scope, element, attrs){
            window.Parsley.addValidator('domain', {
                requirementType: 'string',


            });
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
            scope.ngValue = scope.model.join(',');
        }
    };
}]);
