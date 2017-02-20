'use strict';

angular.module('screenshot').factory('ScreenshotFetcher', ['$http', function($http) {
	var fetcher = {};
	fetcher.fetchByAdvertisers = function(queryParams) {
		var path = '/console/screenshot/byAdvertiser';
		return $http({
			method: 'GET',
			url: path,
			params: queryParams
		});
	};
	fetcher.fetchByPublishers = function(queryParams) {
		var path = '/console/screenshot/byPublisher';
		return $http({
			method: 'GET',
			url: path,
			params: queryParams
		});
	};
	return fetcher;
}]);
