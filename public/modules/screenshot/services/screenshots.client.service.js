'use strict';

angular.module('screenshot').factory('Screenshot', ['$resource', function($resource) {
	return $resource('/console/screenshot/:screenshotId', { screenshotId: '@_id' },
		{
			query: { method: 'GET', isArray: false },
			update: { method: 'PATCH'},
			create: { method: 'POST'},
			updateOrCreate: { method: 'PUT'}
		}
	);
}]);
