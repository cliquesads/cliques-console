angular.module('users').controller('BillingController', ['$scope', '$http', '$location', 'Users', 'Authentication','Notify',
    'Organizations',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations) {
        $scope.user = Authentication.user;
        $scope.organization = new Organizations(Authentication.user.organization);
        $scope.handleStripe = function(status, response){
            if(response.error) {
                Notify.alert('Stripe encountered the following error: ' + response.error, {status: 'danger'});
            } else {
                // got stripe token, now charge it or smt
                $scope.organization.$saveStripeToken({ stripeToken: response.id })
                    .then(function(response){
                        $scope.organization = response;
                        Notify.alert('Your credit card has been saved, thanks!', {status: 'success'});
                    }, function(response){
                        Notify.alert(response.data.message, {status: 'danger'});
                    });
            }
        }
    }
]);