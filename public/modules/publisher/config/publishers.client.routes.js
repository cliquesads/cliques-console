'use strict';

// Setting up route
angular.module('publisher').config(['$stateProvider',
	function($stateProvider) {
		// Publisher state routing
		$stateProvider.
		state('app.listPublishers', {
			url: '/publisher',
			title: 'List Publishers',
			templateUrl: 'modules/publisher/views/list-publisher.client.view.html'
		}).
		state('app.createPublisher', {
			url: '/publisher/create',
			title: 'New Publisher',
			templateUrl: 'modules/publisher/views/create-publisher.client.view.html',
            controller: 'PublisherWizardController'
		}).
        state('app.listSite', {
            url: '/publisher/site',
            title: 'List Sites',
            templateUrl: 'modules/publisher/views/list-sites.client.view.html',
            controller: 'SiteController'
        }).
		state('app.viewPublisher', {
			url: '/publisher/:publisherId',
			title: 'View Publisher',
			templateUrl: 'modules/publisher/views/view-publisher.client.view.html',
			controller: 'PublisherController'
		}).
        state('app.viewSite', {
            url: '/publisher/:publisherId/site/:siteId',
            title: 'View Site',
            templateUrl: 'modules/publisher/views/view-site.client.view.html',
            controller: 'SiteController'
        });
	}
]);