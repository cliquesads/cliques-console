'use strict';

angular.module('users').controller('SettingsController', ['$scope', '$http', '$location', '$state', 'Users', 'Authentication',
	function($scope, $http, $location, $state, Users, Authentication) {
		$scope.user = Authentication.user;

		// If user is not signed in then redirect back home
		if (!$scope.user) $location.path('/');

		if ($state.$current.name === 'app.settings'){
			$state.transitionTo('app.settings.profile');
		}
	}
]);