'use strict';

angular.module('users').controller('ChangePasswordController', ['$scope', '$http', '$location', 'Users', 'Authentication','Notify',
    function($scope, $http, $location, Users, Authentication, Notify) {
        $scope.user = Authentication.user;

        // If user is not signed in then redirect back home
        if (!$scope.user) $location.path('/');

        // Change user password
        $scope.changeUserPassword = function() {
            $scope.success = $scope.error = null;
            if ($scope.passwordForm.$valid){
                $http.post('/users/password', $scope.passwordDetails).success(function(response) {
                    // If successful show success message and clear form
                    Notify.alert('Password Changed Successfully', {status: 'success'});
                    $scope.passwordDetails = null;
                }).error(function(response) {
                    Notify.alert(response.message, {status: 'danger'});
                });
            }
        };
    }
]);