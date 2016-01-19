'use strict';

// Setting up route
angular.module('advertiser').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
        state('app.advertiser', {
            title: 'Advertiser',
            abstract: true,
            templateUrl: 'modules/advertiser/views/advertiser-layout.client.view.html'
        }).
		state('app.advertiser.listAdvertiser', {
            url: '/advertiser',
            title: 'List Advertiser',
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/list-advertiser.client.view.html',
                    controller: 'AdvertiserController'
                },
                'titleBar': {
                    template: 'Advertisers'
                }
            }
		}).
		state('app.advertiser.createAdvertiser', {
			url: '/advertiser/create',
			title: 'New Advertiser',
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/create-advertiser.client.view.html',
                    controller: 'AdvertiserWizardController'
                },
                'titleBar': {
                    template: 'New Advertiser'
                }
            }
		}).
        state('app.advertiser.listCampaign', {
            url: '/advertiser/campaign',
            title: 'List Campaigns',
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/list-campaigns.client.view.html',
                    controller: 'CampaignController'
                },
                'titleBar': {
                    template: 'Campaigns'
                }
            }
        }).
		state('app.advertiser.viewAdvertiser', {
			url: '/advertiser/:advertiserId',
			title: 'View Advertiser',
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/view-advertiser.client.view.html',
                    controller: 'AdvertiserController'
                },
                'titleBar': {
                    templateUrl: 'modules/advertiser/views/partials/titlebars/view-advertiser.titlebar.html',
                    controller: 'AdvertiserController'
                }
            }
		}).
        state('app.advertiser.viewAdvertiser.viewCampaign', {
            url: '/campaign/:campaignId',
            title: 'View Campaign',
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/view-campaign.client.view.html',
                    controller: 'CampaignController'
                },
                'titleBar': {
                    templateUrl: 'modules/advertiser/views/partials/titlebars/view-campaign.titlebar.html',
                    controller: 'CampaignController'
                }
            }
        }).
        state('app.advertiser.viewAdvertiser.viewCampaign.viewCampaignPlacementTargets', {
            url: '/placement-targets',
            title: 'Placement Targets',
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/site-targeting.client.view.html',
                    controller: 'SiteTargetingController'
                },
                'titleBar': {
                    templateUrl: 'modules/advertiser/views/partials/titlebars/view-campaign.titlebar.html',
                    controller: 'SiteTargetingController'
                }
            }
        });
	}
]);