'use strict';

// Setting up route
angular.module('advertiser').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
        state('app.admin', {
            title: 'Admin',
            abstract: true,
            templateUrl: 'modules/admin/views/admin-layout.client.view.html'
        }).
		state('app.admin.main', {
            url: '/admin',
            title: 'Admin Tools',
            views: {
                'main': {
                    templateUrl: 'modules/admin/views/admin-tools.client.view.html',
                    controller: 'AdminController'
                },
                'titleBar': {
                    template: 'Admin Tools'
                }
            }
		});
	}
]);