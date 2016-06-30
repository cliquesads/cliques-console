
angular.module('payments').directive('accountnumber', function(){
    return {
        require: 'ngModel',
        scope: {
            country: '@'
        },
        link: function(scope, elem, attrs, ctrl){
            scope.$watch("country", function(newVal, oldVal){
                scope.country = newVal;
            });
            ctrl.$validators.accountnumber = function(modelValue, viewValue){
                if (ctrl.$isEmpty(modelValue)){
                    return true;
                }
                return Stripe.bankAccount.validateAccountNumber(modelValue, scope.country);
            }
        }
    }
})
.directive('routingnumber', function(){
    return {
        require: 'ngModel',
        scope: {
            country: '@'
        },
        link: function(scope, elem, attrs, ctrl){
            scope.$watch("country", function(newVal, oldVal){
                scope.country = newVal;
            });
            ctrl.$validators.routingnumber = function(modelValue, viewValue){
                if (ctrl.$isEmpty(modelValue)){
                    return true;
                }
                return Stripe.bankAccount.validateRoutingNumber(modelValue, scope.country);
            }
        }
    }
})
.directive('stripeBankAccountForm', ['REGEXES', function(REGEXES){
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

            // get string form of regex, as actual regex literals don't pass through
            // to template properly I have no idea why
            // scope.dateRegex = REGEXES.datePattern;
            // TODO: Could never get this to pass to template properly.  Giving up for now, pasting
            // TODO: directly in the template

            scope.submitted = false;
            scope.validateInput = function(name, type) {
                var input = scope.stripeBankAccountForm[name];
                return (input.$dirty || scope.submitted) && input.$error[type];
            };

            scope.dob = null;
            scope.wrapper = function(status, response){
                scope.onSave({ status: status, response: response, verificationData: {
                    accountType: scope.account.account_holder_type,
                    dob: scope.dob
                }});
            };

            scope.submit = function(){
                scope.submitted = true;
                Stripe.bankAccount.createToken(scope.account, scope.wrapper);
            };
        }
    };
}]);