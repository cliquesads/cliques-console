'use strict';

// Users service used for communicating with the users REST endpoint
angular.module('accesscode').factory('AccessCode', ['$resource',
    function($resource) {
        return $resource('console/accesscode/:accessCodeId', { accessCodeId: '@_id'}, {});
    }
]);
