'use strict';

angular.module('screenshot').factory('ScreenshotFetcher', ['$http', function($http) {
	var fetcher = {};
	fetcher.fetch = function(queryParams) {
		var path = '/console/screenshot/getMany';
		return $http({
			method: 'GET',
			url: path,
			params: queryParams
		});
	};
	return fetcher;
}]);
