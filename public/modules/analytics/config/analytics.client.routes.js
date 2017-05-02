'use strict';

// Setting up route
angular.module('analytics').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
        /*************************************************
         * BASE ANALYTICS ROUTES (ABSTRACT & NON-ABSTRACT)
         *************************************************/
        state('app._analytics', {
            title: '_Analytics',
            abstract: true,
            templateUrl: 'modules/analytics/views/analytics-layout.client.view.html'
        }).
        state('app._analytics.analytics', {
            title: 'Analytics',
            url: '/analytics',
            resolve: {
                $title: function(){ return 'Analytics'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/analytics.client.view.html',
                    controller: 'AnalyticsController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
        }).

        /*********************************
         ***** QUICK QUERIES ROUTES ******
         *********************************/
        state('app._analytics.analytics.quickQueries', {
            url: '/quick-queries',
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
        state('app._analytics.analytics.quickQueries.time', {
            url: '/time',
            queryType: 'time',
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
        state('app._analytics.analytics.quickQueries.site', {
            url: '/site',
            queryType: 'site',
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
        state('app._analytics.analytics.quickQueries.campaign', {
            url: '/campaign',
            queryType: 'campaign',
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
        state('app._analytics.analytics.quickQueries.creative', {
            url: '/creative',
            queryType: 'creative',
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
        state('app._analytics.analytics.quickQueries.placement', {
            url: '/placement',
            queryType: 'placement',
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
        state('app._analytics.analytics.quickQueries.state', {
            url: '/state',
            queryType: 'state',
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
        state('app._analytics.analytics.quickQueries.city', {
            url: '/city',
            queryType: 'city',
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
        state('app._analytics.analytics.quickQueries.country', {
            url: '/country',
            queryType: 'country',
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

        /**********************************
         ***** RECENT QUERIES ROUTES ******
         **********************************/
        state('app._analytics.analytics.recentQueriesList', {
            url: '/recent-queries',
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

        /*********************************
         ***** MY QUERIES ROUTES *********
         *********************************/
        state('app._analytics.analytics.myQueriesList', {
            url: '/my-queries',
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

        /**********************************
         ***** CUSTOM QUERIES ROUTES ******
         **********************************/
        state('app._analytics.analytics.customQuery', {
            url: '/custom-query',
            title: 'Analytics',
            resolve: {
                $title: function(){ return 'Custom Query'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/customize-query.client.view.html',
                    controller: 'AnalyticsCustomizeController'
                },
                'sideBar': {
                    templateUrl: 'modules/analytics/views/partials/sidebar.client.view.html',
                    controller: 'AnalyticsSidebarController'
                }
            }
        }).
        state('app._analytics.analytics.customQuery.result', {
            url: '/result',
            params: {
                defaultQueryParam: null
            },
            resolve: {
                $title: function(){ return 'Query Result'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/analytics/views/partials/custom-query-result.client.view.html',
                    controller: 'AnalyticsCustomizeController'
                }
            }
        });
	}
]);