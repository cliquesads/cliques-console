angular.module('users').controller('BillingController', ['$scope', '$http', '$location', 'Users', 'Authentication',
    function($scope, $http, $location, Users, Authentication) {
        $scope.user = Authentication.user;

    }
]);