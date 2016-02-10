'use strict';

// Setting up route
angular.module('publisher').config(['$stateProvider',
	function($stateProvider) {
		// Publisher state routing
		$stateProvider.
        state('app.publisher', {
            title: 'Publisher',
            abstract: true,
            templateUrl: 'modules/publisher/views/publisher-layout.client.view.html'
        }).
		state('app.publisher.mySites', {
			url: '/mysites',
			title: 'My Sites',
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/mysites.client.view.html',
                    controller: 'PublisherController'
                },
                'titleBar': {
                    template: 'Select a Publisher'
                }
            }
		}).
		state('app.publisher.createPublisher', {
			url: '/publisher/create',
			title: 'New Publisher',
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/create-publisher.client.view.html',
                    controller: 'PublisherWizardController'
                },
                'titleBar': {
                    template: 'New Publisher'
                }
            }
		}).
		state('app.publisher.viewPublisher', {
			url: '/publisher/:publisherId',
			title: 'View Publisher',
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/view-publisher.client.view.html',
                    controller: 'PublisherController'
                },
                'titleBar': {
                    templateUrl: 'modules/publisher/views/partials/titlebar/view-publisher.titlebar.html',
                    controller: 'PublisherController'
                }
            }
		}).
        state('app.publisher.viewPublisher.viewSite', {
            url: '/site/:siteId',
            title: 'View Site',
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/view-site.client.view.html',
                    controller: 'SiteController'
                },
                'titleBar': {
                    templateUrl: 'modules/publisher/views/partials/titlebar/view-site.titlebar.html',
                    controller: 'SiteController'
                }
            }
        }).
        state('app.publisher.viewPublisher.viewSite.viewPage', {
            url: '/page/:pageId',
            title: 'Page Manager',
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/view-page.client.view.html',
                    controller: 'PageController'
                },
                'titleBar': {
                    templateUrl: 'modules/publisher/views/partials/titlebar/view-page.titlebar.html',
                    controller: 'PageController'
                }
            }
        });
	}
]);