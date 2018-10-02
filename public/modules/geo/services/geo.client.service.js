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
	return $resource('/console/country/:countryId', { countryId: '@_id' }, 
		{
			readOne: { method: 'GET', isArray: false },
			query: { method: 'GET', isArray: true }
		}
	);
}])
.factory('Region', ['$resource', function($resource) {
	return $resource('/console/region/:regionId', { regionId: '@_id' }, 
		{
			query: { method: 'GET', isArray: true },
			readOne: { method: 'GET', isArray: false },
			update: { method: 'PATCH' }
		}
	);
}])
.factory('DMA', ['$resource', function($resource) {
	return $resource('/console/dma/:dmaId', { dmaId: '@_id'},
		{}
	);
}]);
