'use strict';

// Geo cities service used for communicating with the geo cities REST endpoints
angular.module('geo')
.factory('City', ['$resource',function($resource) {
	return $resource('/console/city', {},
		{
			query: { method: 'GET', isArray: true },
			create: { method: 'POST', isArray: true }
		}
	);
}])
.factory('Country', ['$resource', function($resource) {
	return $resource('/console/country', {}, {});
}])
.factory('Region', ['$resource', function($resource) {
	return $resource('/console/region/:regionId', { regionId: '@_id' }, 
		{
			update: { method: 'PATCH' }
		}
	);
}]);
