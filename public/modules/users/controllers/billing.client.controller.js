angular.module('users').controller('BillingController', ['$scope', '$http', '$location', 'Users', 'Authentication','Notify',
    'Organizations', 'Payment',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, Payment) {
        $scope.user = Authentication.user;
        $scope.organization = new Organizations(Authentication.user.organization);

        // get all payments to populate billing history
        $scope.payments = Payment.query();

        // control variable for CC add form toggling
        $scope.editStripe = false;

        // loading control var
        $scope.loading = false;

        // Load stripe Customer object associated w/ Organization, if applicable
        $scope.stripeCustomer = null;
        var getStripeCustomer = function(){
            if ($scope.organization.stripeCustomerId){
                var org = new Organizations($scope.organization);
                org.$getStripeCustomer().then(function(customer){
                    $scope.stripeCustomer = customer;
                    $scope.defaultCard = customer.sources.data.filter(function(source){
                        return source.id === customer.default_source
                    })[0];
                }, function(response){
                    console.error(response.data.message);
                });
            }
        };
        getStripeCustomer();

        $scope.updateOrganization = function(){
            $scope.organization.$update(function(response){
                $scope.organization = response;
                Notify.alert('Billing Preference Saved', {status: 'success'});
                $scope.allowSave = false;
            }, function(response){
                Notify.alert(response.data.message, {status: 'danger'});
            });
        };

        $scope.reset = function(){
            $scope.organization = Organizations.get({
                organizationId: Authentication.user.organization._id
            });
            $scope.allowSave = false;
        };

        $scope.allowSave = false;
        $scope.$watch('organization.billingPreference', function(newValue, oldValue){
            if (oldValue && oldValue != newValue){
                if (newValue == 'Check'){
                    $scope.allowSave = true;
                }
            }
        });

        $scope.addToken = function(status, response){
            $scope.loading = true;
            if(response.error) {
                $scope.loading = false;
                Notify.alert('Stripe encountered the following error: ' + response.error, {status: 'danger'});
            } else {
                // first update org to save billing preference
                $scope.organization.$update().then(function(org){
                    // got stripe token, now charge it or smt
                    return $scope.organization.$saveStripeToken({ stripeToken: response.id });
                }).then(function(response){
                    // now handle post-save steps
                    $scope.organization = response;
                    $scope.loading = false;
                    Notify.alert('Your credit card has been saved, thanks!', {status: 'success'});
                    // update default card setting
                    getStripeCustomer();
                    // close form
                    $scope.editStripe = false;
                }, function(response){
                    $scope.loading = false;
                    Notify.alert(response.data.message, {status: 'danger'});
                });
            }
        }
    }
]);