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
        }).
        state('app.admin.listAccessCodes', {
            url: '/admin/access-codes',
            title: 'All Access Codes',
            resolve: {
                $title: function(){ return 'All Access Codes'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/accesscode/views/list-accesscode.client.view.html',
                    controller: 'ListAccessCodeController'
                }
            }
        }).
        state('app.admin.listAccessCodes.viewAccessCode', {
            url: '/admin/access-codes/:accessCodeId',
            title: 'View Access Codes',
            resolve: {
                accessCode: function(AccessCode, $stateParams){
                    return AccessCode.get({ accessCodeId: $stateParams.accessCodeId }).$promise;

                },
                $title: function(accessCode){ return accessCode.code; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/accesscode/views/view-access-code.client.view.html',
                    controller: 'ViewAccessCodeController'
                }
            }
        });
	}
]);