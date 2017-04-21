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
        state('app.analytics.quickQueries.time', {
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
        state('app.analytics.quickQueries.site', {
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
        state('app.analytics.quickQueries.campaign', {
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
        state('app.analytics.quickQueries.creative', {
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
        state('app.analytics.quickQueries.placement', {
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
        state('app.analytics.quickQueries.state', {
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
        state('app.analytics.quickQueries.city', {
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
        state('app.analytics.quickQueries.country', {
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
        state('app.analytics.myQueriesList', {
            url: '/analytics/myQueriesList',
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
        state('app.analytics.customize', {
            url: '/analytics/customize',
            title: 'Analytics',
            resolve: {
                $title: function(){ return 'Customize Query'; }
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
        state('app.analytics.customize.result', {
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