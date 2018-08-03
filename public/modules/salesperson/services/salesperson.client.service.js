'use strict';

angular.module('salesperson').factory('SalesPerson', ['$resource', function($resource) {
	return $resource('/console/salesperson/:salesPersonId', { salesPersonId: '@_id' },
		{
			query: { method: 'GET', isArray: false },
			update: { method: 'PATCH'},
			create: { method: 'POST'},
			updateOrCreate: { method: 'PUT'}
		}
	);
}]);
