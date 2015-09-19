'use strict';

// Setting up route
angular.module('clique').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
		state('app.listCliques', {
			url: '/clique',
			title: 'List Cliques',
			templateUrl: 'modules/clique/views/list-cliques.client.view.html',
            controller: 'CliqueController'
		});
	}
]);