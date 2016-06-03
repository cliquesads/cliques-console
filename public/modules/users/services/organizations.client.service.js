/**
 * Created by bliang on 3/11/16.
 */

//Articles service used for communicating with the articles REST endpoints
angular.module('users').factory('Organizations', ['$resource',
    function($resource) {
        return $resource('organization/:organizationId', { organizationId: '@_id'},
            {
                update: { method: 'PATCH'},
                create: { method: 'POST'}
            }
        );
    }
]);