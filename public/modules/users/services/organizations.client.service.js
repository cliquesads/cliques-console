/**
 * Created by bliang on 3/11/16.
 */

//Articles service used for communicating with the articles REST endpoints
angular.module('users').factory('Organizations', ['$resource',
    function($resource) {
        return $resource('console/organization/:organizationId', { organizationId: '@_id'},
            {
                update: { method: 'PATCH'},
                get: { url: '/organization/:organizationId' },
                create: { method: 'POST', url: '/organization'}
            }   
        );
    }
]);