/* globals deploymentMode */
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
        })
        .state('app.admin.listAccessLinks', {
            url: '/admin/access-link',
            title: 'Organization Invites',
            resolve: {
                $title: function () {
                    return 'Organization Invites';
                }
            },
            views: {
                'main': {
                    templateUrl: 'modules/accesscode/views/list-accesslink.client.view.html',
                    controller: 'ListAccessLinksController'
                }
            }
        })
        .state('app.admin.listSalespeople', {
            url: '/admin/salespeople',
            title: 'Salespeople',
            resolve: {
                $title: function () {
                    return 'Salespeople';
                }
            },
            views: {
                'main': {
                    templateUrl: 'modules/salesperson/views/list-salespeople.client.view.html',
                    controller: 'SalesPersonController'
                }
            }
        });
	}
]);