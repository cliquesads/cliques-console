'use strict';

// Setting up route
angular.module('clique').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
		state('app.listCliques', {
			url: '/clique',
			title: 'List Cliques',
			templateUrl: 'modules/clique/views/list-cliques.client.view.html'
		});
		//state('app.createAdvertiser', {
		//	url: '/advertiser/create',
		//	title: 'New Advertiser',
		//	templateUrl: 'modules/advertiser/views/create-advertiser.client.view.html',
         //   controller: 'AdvertiserWizardController'
		//}).
		//state('app.viewAdvertiser', {
		//	url: '/advertiser/:advertiserId',
		//	title: 'View Advertiser',
		//	templateUrl: 'modules/advertiser/views/view-advertiser.client.view.html',
		//	controller: 'AdvertiserController'
		//}).
		//state('app.editAdvertiser', {
		//	title: 'Edit Advertiser',
		//	url: '/advertiser/:advertiserId/edit',
		//	templateUrl: 'modules/advertiser/views/edit-advertiser.client.view.html'
		//});
	}
]);