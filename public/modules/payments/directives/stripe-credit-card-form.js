/**
 * Created by bliang on 1/11/16.
 */
angular.module('users').directive('stripeCreditCardForm', function(){
    'use strict';
    return {
        restrict: 'E',
        scope: {
            onSave: '&'
        },
        templateUrl: 'modules/payments/views/partials/stripe-credit-card-form.html',
        link: function(scope, element, attrs){
            scope.wrapper = function(status, response){
                scope.onSave({ status: status, response: response });
            };
        }
    };
});