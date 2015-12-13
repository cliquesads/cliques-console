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
            views: {
                'titleBar': {
                    template: 'Cliques'
                },
                'main': {
                    templateUrl: 'modules/clique/views/list-cliques.client.view.html',
                    controller: 'CliqueController'
                }
            }
		});
	}
]);