/**
 * Created by bliang on 1/11/16.
 */
angular.module('users').directive('stripeCcForm', function(){
    'use strict';
    return {
        restrict: 'E',
        scope: {
            onSave: '&'
        },
        templateUrl: 'modules/users/views/partials/stripe-credit-card-form.html',
        link: function(scope, element, attrs){

        }
    };
});