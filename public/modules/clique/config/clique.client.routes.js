'use strict';

// Setting up route
angular.module('clique').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
        state('app.cliques',{
            abstract: true,
            title: 'Cliques',
            templateUrl: 'modules/clique/views/cliques-layout.client.view.html'
        }).
		state('app.cliques.listCliques', {
			url: '/clique',
			title: 'List Cliques',
            resolve: {
                $title: function(){ return 'List Cliques'; }
            },
            views: {
                'titleBar': {
                    template: 'Cliques'
                },
                'main': {
                    templateUrl: 'modules/clique/views/list-cliques.client.view.html',
                    controller: 'CliqueController'
                }
            }
		}).
        state('app.cliques.browseSites', {
            url: '/browse-sites',
            title: 'Browse All Sites',
            resolve: {
                $title: function(){ return 'Browse All Sites'; }
            },
            views: {
                'titleBar': {
                    template: 'Site Browser'
                },
                'main': {
                    templateUrl: 'modules/clique/views/browse-sites.client.view.html',
                    controller: 'BrowseSitesController'
                }
            }
        });
	}
]);