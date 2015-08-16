'use strict';

// Setting up route
angular.module('advertiser').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
		state('app.listAdvertiser', {
			url: '/advertiser',
			title: 'List Advertiser',
			templateUrl: 'modules/advertiser/views/list-advertiser.client.view.html'
		}).
		state('app.createAdvertiser', {
			url: '/advertiser/create',
			title: 'New Advertiser',
			templateUrl: 'modules/advertiser/views/create-advertiser.client.view.html',
            controller: 'AdvertiserWizardController'
		}).
		state('app.viewAdvertiser', {
			url: '/advertiser/:advertiserId',
			title: 'View Advertiser',
			templateUrl: 'modules/advertiser/views/view-advertiser.client.view.html',
			controller: 'AdvertiserController'
		}).
        state('app.viewCampaign', {
            url: '/advertiser/:advertiserId/campaign/:campaignId',
            title: 'View Campaign',
            templateUrl: 'modules/advertiser/views/view-campaign.client.view.html',
            controller: 'CampaignController'
        })
	}
]);