/**
 * Created by bliang on 1/11/16.
 */
/**
 * Created by bliang on 8/15/15.
 */
angular.module('users').directive('termsPanel', ['TermsAndConditions','$compile',function(TermsAndConditions, $compile){
    'use strict';
    return {
        scope: true,
        link: function(scope, element, attrs){
            var terms;
            attrs.$observe('template', function(tpl){
                terms = $compile(tpl)(scope);
                element.html("");
                element.append(terms);
            });

        }
    };
}]);