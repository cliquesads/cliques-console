'use strict';

angular.module('users').controller('SettingsController', ['$scope', '$http', '$location', '$state', 'Users', 'Authentication', 'Organizations',
	function($scope, $http, $location, $state, Users, Authentication, Organizations) {
		$scope.user = Authentication.user;
		$scope.organization = Organizations.get({
			organizationId: Authentication.user.organization._id
		});

		// If user is not signed in then redirect back home
		if (!$scope.user) $location.path('/');

		if ($state.$current.name === 'app.settings'){
			$state.transitionTo('app.settings.profile');
		}
	}
]);