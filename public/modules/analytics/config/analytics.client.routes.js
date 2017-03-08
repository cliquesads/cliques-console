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
            resolve: {
                $title: function(){ return 'Quick Queries'; }
            },
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
        state('app.analytics.recentQueries', {
            url: '/analytics/recentQueries',
            resolve: {
                $title: function(){ return 'Recent Queries'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/recent-queries.client.view.html',
                    controller: 'AnalyticsListController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
        }).
        state('app.analytics.myQueries', {
            url: '/analytics/myQueries',
            resolve: {
                $title: function(){ return 'My Queries'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/my-queries.client.view.html',
                    controller: 'AnalyticsListController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }                
            }
        }).
        state('app.analytics.timeQuery', {
            url: '/analytics/timeQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'Quick Queries > Time Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/time-query.client.view.html',
                    controller: 'AnalyticsController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
        }).
        state('app.analytics.sitesQuery', {
            url: '/analytics/sitesQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'Quick Queries > Sites Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/sites-query.client.view.html',
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
            resolve: {
                $title: function(){ return 'Custom Queries'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/custom-query.client.view.html',
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