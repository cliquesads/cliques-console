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
		state('app.password', {
			url: '/settings/password',
			templateUrl: 'modules/users/views/settings/change-password.client.view.html'
		}).
		state('app.profile', {
			url: '/settings/profile',
			templateUrl: 'modules/users/views/settings/edit-profile.client.view.html'
		});
	}
]);