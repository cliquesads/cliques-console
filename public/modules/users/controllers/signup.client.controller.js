'use strict';

angular.module('users').controller('SignUpController', ['$scope', '$http', '$location', '$window','Authentication','Timezones',
	function($scope, $http, $location, $window, Authentication, Timezones) {
		$scope.authentication = Authentication;

		// If user is signed in then redirect back home
		if ($scope.authentication.user) $location.path('/');

        // TODO: get this from model enum
        $scope.timezoneChoices = Timezones;
        $scope.credentials = {
            tz: 'America/New_York'
        };
        $scope.roleChoices = [{name: 'Advertiser', value: 'advertiser'},{name: 'Publisher', value: 'publisher'}];

		$scope.signup = function() {
            // Add access code ref to user before submitting for tracking purposes
            $scope.credentials.accesscode = $scope.authentication.accesscode;
            $scope.credentials.roles = [$scope.role];
			$http.post('/auth/signup', $scope.credentials).success(function(response) {
				// If successful we assign the response to the global user model
				$scope.authentication.user = response;
                $scope.authentication.accesscode = null;
				// And redirect to the index page
                $window.location.href = '/';
			}).error(function(response) {
				$scope.error = response.message;
			});
		};
	}
]);