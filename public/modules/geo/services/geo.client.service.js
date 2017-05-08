'use strict';

// Geo cities service used for communicating with the geo cities REST endpoints
angular.module('geo')
.factory('City', ['$resource',function($resource) {
	return $resource('/console/city', {}, {});
}])
.factory('Country', ['$resource', function($resource) {
	return $resource('/console/country', {}, {});
}])
.factory('Region', ['$resource', function($resource) {
	return $resource('/console/region', {}, {})	;
}]);
