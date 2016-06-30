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
                var loadingDialog = ngDialog.open({
                    className: 'ngdialog-theme-default dialogwidth600',
                    template: '\
                    <h4>Securely sending your card information to <i class="fa fa-lg fa-cc-stripe"></i> ...</h4>\
                    <div class="row text-center">\
                        <div class="ball-pulse">\
                            <div></div>\
                            <div></div>\
                            <div></div>\
                        </div>\
                    </div>',
                    plain: true
                });
                scope.onSave({ status: status, response: response, loadingDialog: loadingDialog });
            };
        }
    };
});