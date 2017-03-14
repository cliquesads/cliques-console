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
            resolve: {
                $title: function(){ return 'Cliques Network Report'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/admin/views/network-report.client.view.html',
                    controller: 'NetworkReportController'
                }
            }
		}).
        state('app.admin.paymentAdmin', {
            url: '/admin/payment-admin',
            title: 'Payment Admin',
            resolve: {
                $title: function(){ return 'Payment Admin'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/payments/views/payment-admin.client.view.html',
                    controller: 'PaymentAdminController'
                },
                'titleBar': {
                    templateUrl: 'modules/payments/views/partials/payment-titlebar.client.view.html',
                    controller: 'PaymentAdminController'
                }
            }
        }).
        state('app.admin.accessCodes', {
            url: '/admin/access-codes',
            title: 'Send Access Codes',
            resolve: {
                $title: function(){ return 'Send Access Codes'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/accesscode/views/accesscode-view.client.view.html',
                    controller: 'AccessCodeController'
                }
            }
        });
	}
]);