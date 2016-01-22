/**
 * Created by bliang on 1/11/16.
 */
angular.module('users').directive('stripeCcForm', function(){
    'use strict';
    return {
        scope: true,
        templateUrl: 'modules/users/views/authentication/partials/stripe-checkout.html',
        link: function(scope, element, attrs){}
    };
});