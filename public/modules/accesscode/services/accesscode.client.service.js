'use strict';

// Users service used for communicating with the users REST endpoint
angular.module('accesscode').factory('AccessCode', ['$resource',
    function($resource) {
        return $resource('console/accesscode/:accessCodeId', { accessCodeId: '@_id'}, {
            update: { method: 'PATCH'},
            create: { method: 'POST'}
        });
    }
])
.factory('AccessLink', ['$resource',
    function($resource) {
        return $resource('console/accesslink/:accessLinkId', { accessLinkId: '@_id'}, {
            get: { url: '/accesslink/:accessLinkId' },
            update: { method: 'PATCH'},
            create: { method: 'POST'}
        });
    }
]);
