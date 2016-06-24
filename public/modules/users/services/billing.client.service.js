'use strict';

// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Payment', ['$resource',
	function($resource) {
		return $resource('console/payment/:paymentId', { paymentId: '@_id'}, {
            update: { method: 'PATCH'},
            updateOrCreate: { method: 'PUT'}
		});
	}
]);