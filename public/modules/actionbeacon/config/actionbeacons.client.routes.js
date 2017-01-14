'use strict';

// Setting up route
angular.module('actionbeacon').config(['$stateProvider',
	function($stateProvider) {
		// ActionBeacon state routing
		$stateProvider.
		state('app.actionbeacon', {
			title: 'ActionBeacon',
			abstract: true,
			templateUrl: 'modules/actionbeacon/views/actionbeacon-layout.client.view.html'
		}).
		state('app.actionbeacon.listActionbeacon', {
			url: '/actionbeacon',
			title: 'Action Beacons',
			views: {
				'main': {
					templateUrl: 'modules/actionbeacon/views/list-actionbeacon.client.view.html',
					controller: 'ActionBeaconController'
				},
				'titleBar': {
					template: 'ActionBeacons'
				}
			}
		});
	}
]);