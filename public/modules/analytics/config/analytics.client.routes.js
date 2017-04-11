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
        state('app.analytics.quickQueries.timeQuery', {
            url: '/timeQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'Time Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        }).
        state('app.analytics.quickQueries.sitesQuery', {
            url: '/sitesQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'Sites Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        }).
        state('app.analytics.quickQueries.campaignsQuery', {
            url: '/campaignsQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function() { return 'Campaigns Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        }).
        state('app.analytics.quickQueries.creativesQuery', {
            url: '/creativesQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'Creatives Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        }).
        state('app.analytics.quickQueries.placementsQuery', {
            url: '/placementsQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function() { return 'Placements Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        }).
        state('app.analytics.quickQueries.statesQuery', {
            url: '/statesQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'States Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        }).
        state('app.analytics.quickQueries.citiesQuery', {
            url: '/citiesQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'Cities Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        }).
        state('app.analytics.quickQueries.countriesQuery', {
            url: '/countriesQuery',
            params: {
                query: null
            },
            resolve: {
                $title: function(){ return 'Countries Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/quick-query.client.view.html',
                    controller: 'AnalyticsController'
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
                    templateUrl: 'modules/analytics/views/partials/queries-list.client.view.html',
                    controller: 'AnalyticsListController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
        }).
        state('app.analytics.customQueriesList', {
            url: '/analytics/customQueriesList',
            resolve: {
                $title: function(){ return 'My Queries'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/queries-list.client.view.html',
                    controller: 'AnalyticsListController'
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
        }).
        state('app.analytics.customizeQuery.queryResult', {
            url: '/queryResult',
            params: {
                customQuery: null
            },
            resolve: {
                $title: function(){ return 'Query Result'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/custom-query-result.client.view.html',
                    controller: 'AnalyticsController'
                }
            }
        });
	}
]);