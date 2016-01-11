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
        $scope.organization = {
            country: 'USA'
        };
        $scope.roleChoices = [
            {
                name: 'Advertiser',
                description:'I\'d like to run advertising campaigns on Cliques',
                value: 'advertiser'
            },
            {
                name: 'Publisher',
                description:'I\'d like to run Cliques ad placements on my website',
                value: 'publisher'
            }];

        $scope.role = 'advertiser';

        $scope.$watch(function(scope){ return scope.credentials.email; }, function(newEmail, oldEmail){
            if (newEmail){
                if (newEmail != oldEmail && !$scope.credentials.username){
                    $scope.credentials.username = newEmail;
                }
            }
        });

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