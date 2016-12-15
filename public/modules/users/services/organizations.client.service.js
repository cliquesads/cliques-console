'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('users').factory('Organizations', ['$resource',
    function($resource) {
        return $resource('console/organization/:organizationId', { organizationId: '@_id'},
            {
                update: { method: 'PATCH'},
                get: { url: '/organization/:organizationId' },
                create: { method: 'POST', url: '/organization'},
                saveStripeTokenToCustomer: { method: 'POST', url: 'console/organization/:organizationId/stripe-customer/save-token' },
                getStripeCustomer: { method: 'GET', url: 'console/organization/:organizationId/stripe-customer' },
                saveStripeTokenToAccount: { method: 'POST', url: 'console/organization/:organizationId/stripe-account/save-token' },
                getStripeAccount: { method: 'GET', url: 'console/organization/:organizationId/stripe-account' }
            }   
        );
    }
]);