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
        state('app.analytics.recentQueriesList', {
            url: '/analytics/recentQueriesList',
            resolve: {
                $title: function(){ return 'Recent Queries'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/recent-queries-list.client.view.html',
                    controller: 'AnalyticsListController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
        }).
        state('app.analytics.myQueriesList', {
            url: '/analytics/myQueriesList',
            resolve: {
                $title: function(){ return 'My Queries'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/my-queries-list.client.view.html',
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
        state('app.analytics.customizeQuery', {
            url: '/analytics/customizeQuery',
            title: 'Analytics',
            resolve: {
                $title: function(){ return 'Customize Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/customize-query.client.view.html',
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