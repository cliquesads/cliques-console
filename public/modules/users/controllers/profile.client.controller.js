angular.module('users').controller('ProfileController', ['$scope', '$http', '$location', 'Users', 'Authentication','Timezones',
    function($scope, $http, $location, Users, Authentication, Timezones) {
        $scope.user = Authentication.user;
        $scope.timezoneChoices = Timezones;

        // Update a user profile
        $scope.updateUserProfile = function(isValid) {
            if (isValid) {
                $scope.success = $scope.error = null;
                var user = new Users($scope.user);

                user.$update(function(response) {
                    $scope.success = true;
                    Authentication.user = response;
                }, function(response) {
                    $scope.error = response.data.message;
                });
            } else {
                $scope.submitted = true;
            }
        };
    }
]);