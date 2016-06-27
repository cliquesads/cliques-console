angular.module('users').controller('BillingController', ['$scope', '$http', '$location', 'Users', 'Authentication','Notify',
    'Organizations', 'Payment',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, Payment) {
        $scope.user = Authentication.user;
        $scope.organization = new Organizations(Authentication.user.organization);
        $scope.payments = Payment.query();
        $scope.editStripe = false;

        $scope.organization.$getStripeCustomer().then(function(customer){
            $scope.stripeCustomer = customer;
            $scope.defaultCard = customer.sources.data.filter(function(source){
                return source.id === customer.default_source
            })[0];
        }, function(response){
            console.error(response.data.message);
        });

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