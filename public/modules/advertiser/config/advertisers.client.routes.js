'use strict';

/**
 * Isolated logic behind campaign routes in which a user must be prompted
 * to select an advertiser first. Logical switch to direct user to appropriate
 * view depending on if they have set up advertisers/campaigns already.
 *
 * Passes inferred advertiserId, if one is found, to callback function, otherwise
 * passes null.
 */
var getImpliedAdvertiserId = function($state, $rootScope, $location, Advertiser, callback){
    if ($rootScope.advertiser) {
        return callback(null, $rootScope.advertiser._id);
    } else {
        Advertiser.query(function (advertisers) {
            // if user only has one advertiser available, the just
            // set that advertiser as default in $rootScope and go
            // to that advertiser's page
            if (advertisers.length === 1) {
                // set rootScope advertiser, since there's only one and this
                // will save a trip to the DB next time.
                $rootScope.advertiser = advertisers[0];
                return callback($rootScope.advertiser._id);
            } else {
                // Otherwise, either user has NOT selected an advertiser yet,
                // or user doesn't have an advertiser.
                return callback(null, null);
            }
        }, function(err){
            return callback(err);
        });
    }
};

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
         * Not a real state, but a logical switch to direct user to appropriate
         * view depending on if they have set up advertisers/campaigns already.
         *
         * Not abstract, though, since it needs to be browseable.
         */
        state('app.advertiser.allCampaigns', {
            url: '/all-campaigns',
            resolve: {
                redirect: function ($state, $rootScope, $location, Advertiser) {
                    getImpliedAdvertiserId($state, $rootScope, $location, Advertiser, function(err, advertiserId){
                        if (advertiserId){
                            // TODO: State.go just hangs, have no idea why
                            $location.path('/advertiser/' + advertiserId);
                        } else {
                            $state.go('app.advertiser.allAdvertisers');
                        }
                    });
                }
            }
        }).

        /**
         * Not a real state, but a logical switch to direct user to appropriate
         * view depending on if they have set up advertisers/campaigns already.
         *
         * Not abstract, though, since it needs to be browseable.
         */
        state('app.advertiser.createCampaign', {
            url: '/new-campaign',
            resolve: {
                redirect: function($state, $rootScope, $location, Advertiser){
                    getImpliedAdvertiserId($state, $rootScope, $location, Advertiser, function(err, advertiserId){
                        if (advertiserId){
                            $location.path('/advertiser/' + advertiserId + '/create/campaign');
                        } else {
                            $state.go('app.advertiser.allAdvertisers');
                        }
                    });
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
                    return Advertiser.get({ advertiserId: $stateParams.advertiserId }).$promise;
                },
                $title: function(advertiser){
                    // TODO: see comment in breadcrumbs.html for we're not returning `advertiser.name` here
                    return advertiser.name;
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
        state('app.advertiser.allAdvertisers.viewAdvertiser.createNewCampaign', {
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
                    var i = _.findIndex(advertiser.campaigns, function(campaign){
                        return campaign._id === $stateParams.campaignId;
                    });
                    return {
                        advertiser: advertiser,
                        index: i,
                        campaign: advertiser.campaigns[i]
                    };
                },
                $title: function(campaign){
                    return campaign.campaign.name;
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