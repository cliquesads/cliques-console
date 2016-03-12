angular.module('users').controller('BillingController', ['$scope', '$http', '$location', 'Users', 'Authentication',
    'Organizations',
    function($scope, $http, $location, Users, Authentication, Organizations) {
        $scope.user = Authentication.user;
        $scope.organization = new Organizations(Authentication.user.organization);

        $scope.handleStripe = function(status, response){
            if(response.error) {
                // there was an error. Fix it.
            } else {
                // got stripe token, now charge it or smt
                token = response.id
            }
        }
    }
]);