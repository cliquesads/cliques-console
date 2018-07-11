'use strict';

// Setting up route
angular.module('users').config(['$stateProvider','RouteHelpersProvider',
	function($stateProvider,helper) {
		// Users state routing
		$stateProvider.
        state('loggedout',{
                // url: '/',
                abstract: true,
                templateUrl: 'modules/users/views/users.client.view.html',
                resolve: helper.resolveFor('modernizr', 'icons'),
                data: {
                    requireLogin: false
                }
            }
        ).
		state('loggedout.signin', {
			url: '/signin',
			templateUrl: 'modules/users/views/authentication/signin.client.view.html'
		}).
        state('loggedout.signup', {
            url: '/signup',
            templateUrl: 'modules/users/views/authentication/signup.client.view.html',
            controller: 'SignUpController'
        }).
        state('loggedout.invite', {
            url: '/invite/:accessLinkId',
            templateUrl: 'modules/users/views/authentication/signup.client.view.html',
            controller: 'SignUpController'
        }).
		state('loggedout.organizationInvite', {
			url: '/invite/organization/:organizationId/:accessTokenId',
			templateUrl: 'modules/users/views/authentication/signup.client.view.html',
			controller: 'SignUpController'
		}).
        state('loggedout.beta-access', {
            url: '/beta-access',
            templateUrl: 'modules/users/views/authentication/requestaccess.client.view.html'
        }).
		state('loggedout.forgot', {
			url: '/password/forgot',
			templateUrl: 'modules/users/views/password/forgot-password.client.view.html'
		}).
		state('loggedout.reset-invalid', {
			url: '/password/reset/invalid',
			templateUrl: 'modules/users/views/password/reset-password-invalid.client.view.html'
		}).
		state('loggedout.reset-success', {
			url: '/password/reset/success',
			templateUrl: 'modules/users/views/password/reset-password-success.client.view.html'
		}).
		state('loggedout.reset', {
			url: '/password/reset/:token',
			templateUrl: 'modules/users/views/password/reset-password.client.view.html'
		}).
		state('app.settings', {
			url: '/settings',
			templateUrl: 'modules/users/views/settings/settings.client.view.html',
			controller: 'SettingsController'
		}).
		state('app.settings.profile', {
			url: '/profile',
			title: 'Profile',
			views: {
				cover: {
					templateUrl: 'modules/users/views/settings/partials/cover.client.view.html',
					controller: 'SettingsCoverController'
				},
				main: {
					templateUrl: 'modules/users/views/settings/partials/profile.client.view.html',
					controller: 'ProfileController'
				}
			}
		}).
		state('app.settings.organization', {
			url: '/organization',
			title: 'Organization',
			views: {
				cover: {
					templateUrl: 'modules/users/views/settings/partials/cover.client.view.html',
					controller: 'SettingsCoverController'
				},
				main: {
					templateUrl: 'modules/users/views/settings/partials/organization.client.view.html',
					controller: 'OrganizationController'
				}
			}
		}).
		state('app.settings.billing', {
			url: '/billing',
			title: 'Billing',
			views: {
				cover: {
					templateUrl: 'modules/users/views/settings/partials/cover.client.view.html',
					controller: 'SettingsCoverController'
				},
				main: {
					templateUrl: 'modules/users/views/settings/partials/billing.client.view.html',
					controller: 'BillingController'
				}
			}
			// data: {
			// 	adminOnly: true
			// }
		}).
		state('app.settings.password', {
			url: '/password',
			title: 'Password',
			views: {
				cover: {
					templateUrl: 'modules/users/views/settings/partials/cover.client.view.html',
					controller: 'SettingsCoverController'
				},
				main: {
					templateUrl: 'modules/users/views/settings/partials/change-password.client.view.html',
					controller: 'ChangePasswordController'
				}
			}
		}).
        state('app.terms-and-conditions',{
            url: '/terms-and-conditions',
            templateUrl: 'modules/users/views/terms-and-conditions.client.view.html',
            controller: 'TermsAndConditionsController'
        });
	}
]);