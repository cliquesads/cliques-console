angular.module('users').controller('ProfileController', ['$scope', '$http', '$location', 'Users', 'Authentication','Timezones','Notify',
    function($scope, $http, $location, Users, Authentication, Timezones, Notify) {
        $scope.user = Authentication.user;
        $scope.initUsername = Authentication.user.username;
        $scope.timezoneChoices = Timezones;

        $scope.$watch(function(scope){ return scope.user.username }, function(newUsername, oldUsername){
            if (newUsername){
                $http.get('/auth/is-username-taken/' + newUsername).success(function(response){
                    $scope.userNameTaken = response.taken;
                });
            }
        });

        // Update a user profile
        $scope.updateUserProfile = function() {
            if ($scope.userForm.$valid && $scope.userForm.$dirty) {
                // Extra validation on client side to ensure request isn't submitted
                // with password already in use.
                if (!$scope.userNameTaken || $scope.user.username === $scope.initUsername){
                    var user = new Users($scope.user);
                    user.$update(function(response) {
                        Authentication.user = response;
                        $scope.initUsername = Authentication.user.username;
                        Notify.alert('Profile Saved Successfully', {status: 'success'});
                    }, function(response) {
                        Notify.alert(response.data.message, {status: 'danger'});
                    });
                }
            } else {
                $scope.submitted = true;
            }
        };
    }
]);