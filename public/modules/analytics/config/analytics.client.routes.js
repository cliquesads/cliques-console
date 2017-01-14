'use strict';

// Setting up route
angular.module('analytics').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
        state('app.analytics', {
            title: 'Analytics',
            abstract: true,
            templateUrl: 'modules/analytics/views/analytics-layout.client.view.html'
        }).
		state('app.analytics.quickQueries', {
            url: '/analytics',
            title: 'Analytics',
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-queries.client.view.html',
                    controller: 'AnalyticsController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
		}).
        state('app.analytics.customQueries', {
            url: '/analytics/customQueries',
            title: 'Analytics',
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/custom-queries.client.view.html',
                    controller: 'AnalyticsController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
        });
	}
]);