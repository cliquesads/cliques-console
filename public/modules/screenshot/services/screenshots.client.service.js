'use strict';

angular.module('screenshot').factory('ScreenshotFetcher', ['$http', function($http) {
	var fetcher = {};
	fetcher.fetchByAdvertisers = function(groupByCampaign) {
		var path = '/console/screenshot/byAdvertiser';
		return $http({
			method: 'GET',
			url: path,
			params: {
				groupByCampaign: groupByCampaign
			}
		});
	};
	fetcher.fetchByPublishers = function(groupByCampaign) {
		var path = '/console/screenshot/byPublisher';
		return $http({
			method: 'GET',
			url: path,
			params: {
				groupByCampaign: groupByCampaign
			}
		});
	};
	return fetcher;
}]);
