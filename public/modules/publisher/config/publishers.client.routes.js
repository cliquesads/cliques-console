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
		//state('app.publisher.listPublishers', {
		//	url: '/publisher',
		//	title: 'List Publishers',
         //   views: {
         //       'main': {
         //           templateUrl: 'modules/publisher/views/list-publisher.client.view.html',
         //           controller: 'PublisherController'
         //       },
         //       'titleBar': {
         //           template: 'Publishers'
         //       }
         //   }
		//}).
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
        //state('app.publisher.listSite', {
        //    url: '/publisher/site',
        //    title: 'List Sites',
        //    views: {
        //        'main': {
        //            templateUrl: 'modules/publisher/views/list-sites.client.view.html',
        //            controller: 'SiteController'
        //        },
        //        'titleBar': {
        //            template: 'Sites'
        //        }
        //    }
        //}).
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
        });
	}
]);