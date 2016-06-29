/**
 * Created by bliang on 1/11/16.
 */
angular.module('users').directive('stripeBankAccountForm', function(){
    'use strict';
    return {
        restrict: 'E',
        scope: {
            onSave: '&'
        },
        templateUrl: 'modules/payments/views/partials/stripe-bank-account-form.html',
        link: function(scope, element, attrs){
            scope.account = {
                country: 'US',
                currency: 'USD',
                account_number: null,
                routing_number: null,
                account_holder_name: null,
                account_holder_type: 'company'
            };

            scope.wrapper = function(status, response){
                scope.onSave({ status: status, response: response });
            };

            scope.submit = function(){
                Stripe.bankAccount.createToken(scope.account, scope.wrapper);
            };
        }
    };
});