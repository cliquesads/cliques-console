'use strict';

angular.module('screenshot').factory('ScreenshotFetcher', ['$http', function($http) {
	var fetcher = {};
	fetcher.fetchByAdvertiserIds = function(advertiserIds, groupByCampaign) {
		var path = '/console/screenshot/byAdvertiser';
		return $http({
			method: 'GET',
			url: path,
			params: {
				advertiserIds: JSON.stringify(advertiserIds),
				groupByCampaign: groupByCampaign
			}
		});
	};
	fetcher.fetchByPublisherIds = function(publisherIds) {
		var path = '/console/screenshot/byPublisher';
		return $http({
			method: 'GET',
			url: path,
			params: {
				publisherIds: JSON.stringify(publisherIds)
			}
		});
	};
	return fetcher;
}]);
