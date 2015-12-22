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
		state('app.admin.networkReport', {
            url: '/admin/network-report',
            title: 'Network Report',
            views: {
                'main': {
                    templateUrl: 'modules/admin/views/network-report.client.view.html',
                    controller: 'NetworkReportController'
                },
                'titleBar': {
                    template: 'Cliques Network Report'
                }
            }
		});
	}
]);