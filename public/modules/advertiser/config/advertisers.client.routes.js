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
		state('app.advertiser.createAdvertiser', {
			url: '/advertiser/create',
            resolve: {
                $title: function(){ return 'New Advertiser'; }
            },
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

        /**
         * Campaign draft states are advertiser-agnostic, just load all drafts in session,
         * so they're rooted at the abstract view level rather than advertiser-specific level.
         */
        state('app.advertiser.campaignDrafts', {
            url: '/advertiser/campaign-draft',
            title: 'My Campaigns Drafts',
            resolve: {
                $title: function(){ return 'My Campaigns Drafts'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/list-campaign-drafts.client.view.html',
                    controller: 'CampaignDraftController'
                },
                'titleBar': {
                    template: 'Campaigns Drafts'
                }
            }
        }).
        state('app.advertiser.campaignDrafts.editDraft', {
            url: '/edit/:draftId',
            resolve: {
                $title: function(){ return 'Edit Draft'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/edit-campaign-draft.client.view.html',
                    controller: 'CampaignDraftController'
                },
                'titleBar': {
                    template: 'Edit Campaign Draft'
                }
            }
        }).

        /**
         * Begin advertiser-specific states, starting at All Advertisers
         */
        state('app.advertiser.allAdvertisers', {
            url: '/advertiser',
            resolve: {
                $title: function(){ return 'All Advertisers'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/list-advertiser.client.view.html',
                    controller: 'ListAdvertisersController'
                },
                'titleBar': {
                    template: 'Advertisers'
                }
            }
        }).
        state('app.advertiser.allAdvertisers.viewAdvertiser', {
            url: '/:advertiserId',
            resolve: {
                advertiser: function($stateParams, Advertiser){
                    return Advertiser.get({ advertiserId: $stateParams.advertiserId });
                },
                $title: function(advertiser){
                    // TODO: see comment in breadcrumbs.html for we're not returning `advertiser.name` here
                    return advertiser;
                }
            },
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
        state('app.advertiser.viewAdvertiser.createNewCampaign', {
            url: '/create/campaign',
            params: {advertiser: null},
            resolve: {
                $title: function(){ return 'New Campaign'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/new-campaign.client.view.html',
                    controller: 'NewCampaignController'
                }
            }
        }).
        state('app.advertiser.allAdvertisers.viewAdvertiser.viewCampaign', {
            url: '/campaign/:campaignId',
            resolve: {
                campaign: function($stateParams, advertiser){
                    return _.find(advertiser.campaigns, function(campaign){
                        return campaign._id === $stateParams.campaignId;
                    });
                },
                $title: function(campaign){
                    return campaign;
                }
            },
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/view-campaign.client.view.html',
                    controller: 'CampaignController'
                }
            }
        }).
        state('app.advertiser.allAdvertisers.viewAdvertiser.viewCampaign.viewCampaignPlacementTargets', {
            url: '/placement-targets',
            resolve: {
                $title: function(){ return 'Placement Targets'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/advertiser/views/site-targeting.client.view.html',
                    controller: 'SiteTargetingController'
                }
            }
        });
	}
]);