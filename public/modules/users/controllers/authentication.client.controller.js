'use strict';

angular.module('users').controller('AuthenticationController', ['$scope', '$http', '$location', '$window','$compile','Authentication','Timezones',
	function($scope, $http, $location, $window, $compile, Authentication, Timezones) {
		$scope.authentication = Authentication;

		// If user is signed in then redirect back home
		if ($scope.authentication.user) $location.path('/');

        // TODO: get this from model enum
        $scope.timezoneChoices = Timezones;
        $scope.credentials = {
            tz: 'America/New_York'
        };

        $scope.loading = false;
        $scope.requestAccess = function(){
            $scope.loading = true;
            $http.post('/auth/access-signup', {code: $scope.accesscode}).success(function(response){
                $scope.authentication.accesscode = response.accesscode;
                // And redirect to the signup page
                $scope.loading = false;
                $location.path('/signup');
            }).error(function(response){
                $scope.loading = false;
                $scope.error = response.message;
            });
        };

		$scope.signin = function() {
			$http.post('/auth/signin', $scope.credentials).success(function(response) {
				// If successful we assign the response to the global user model
				$scope.authentication.user = response;

				// And redirect to the index page
				//$location.url('/home');
                $window.location.href = '/';
			}).error(function(response) {
				$scope.error = response.message;
			});
		};
	}
]);