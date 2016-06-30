angular.module('users').controller('BillingController', ['$scope', '$http', '$location', 'Users', 'Authentication','Notify',
    'Organizations', 'Payment','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, Payment, ngDialog) {
        $scope.user = Authentication.user;
        var organization = $scope.organization = new Organizations(Authentication.user.organization);

        // For simplicity's sake, just assume Organization has only one type, and take first type in list as that type
        // TODO: make this handle multiple org types, but might require broader rewrite of the template & controller
        $scope.orgType = organization.organization_types[0];

        // get all payments to populate billing history
        $scope.payments = Payment.query();

        // control variable for CC add form toggling
        $scope.showStripeForm = false;

        // Stripe form "loading" glyph control var
        $scope.loading = false;

        /**
         * Load stripe Customer object associated w/ Organization, if applicable
         */
        var getStripeCustomerOrAccount = function(){
            // temporary organization copy to use to call stripe API endpoints so $scope.organization isn't overwritten
            var org = new Organizations($scope.organization);
            // get Customer for advertisers AND networkAdmins
            if ($scope.orgType === 'advertiser' || $scope.orgType === 'networkAdmin'){
                if ($scope.organization.stripeCustomerId){
                    org.$getStripeCustomer().then(function(customer){
                        $scope.defaultSource = customer.sources.data.filter(function(source){
                            return source.id === customer.default_source
                        })[0];
                    }, function(response){
                        console.error(response.data.message);
                    });
                }
            // get Account for publishers
            } else if ($scope.orgType === 'publisher'){
                if ($scope.organization.stripeAccountId){
                    org.$getStripeAccount().then(function(account){
                        // TODO: HACK: Just take first account from external_accounts list
                        // TODO: assumes first account is always default, which assumes server will
                        // TODO: always respect this rule of thumb. Right now it does.
                        $scope.defaultSource = account.external_accounts.data[0];
                    }, function(response){
                        console.error(response.data.message);
                    });
                }
            }
        };
        // get stripe customer on load
        getStripeCustomerOrAccount();


        /**
         * Controls for master Save & Cancel buttons
         */
        // capture initial billing preference to know when to update organization
        $scope.initialBillingPreference = organization.billingPreference;
        // whether or not to show save button bar
        $scope.allowSave = false;
        // control variable to allow save to be overridden if stripeForm is toggled open
        $scope.overrideSave = false;
        // Only show save & cancel buttons when billingPreference has changed & is not Stripe,
        // which has its own Save function.
        $scope.$watch('organization.billingPreference', function(newValue, oldValue){
            if (newValue != $scope.initialBillingPreference){
                if (newValue === "Stripe"){
                    if ($scope.defaultSource){
                        $scope.allowSave = true;
                    }
                } else {
                    $scope.allowSave = true;
                }
            } else {
                $scope.allowSave = false;
            }
        });

        // called on "cancel" -- resets state of Organization
        $scope.reset = function(){
            $scope.organization = Organizations.get({
                organizationId: Authentication.user.organization._id
            });
            $scope.allowSave = false;
        };

        // Update billing preference for organization.  Called on master "save"
        $scope.updateOrganization = function(){
            $scope.loading = true;
            // show confirm dialog for Advertisers admonishing them if they switch to "Check" as a preference.
            if ($scope.organization.billingPreference === 'Check' && $scope.orgType === 'advertiser'){
                var dialog = ngDialog.openConfirm({
                    template: '\
                        <p>Setting your billing preference to <strong>Check</strong> means that you will be \
                        responsible for mailing a check payable to Cliques Labs Inc. <strong>no later than 15 \
                        days</strong> after your account statement is due. </p>\
                        <p><strong>Late fees will apply for payments received after the payment deadline.</strong></p>\
                        <p class="text-center">\
                            <button class="btn btn-lg btn-danger" ng-click="confirm()">I get it. I want to change anyway.</button>\
                            <button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
                        </p>',
                    plain: true
                });
                // Wrap $update promise in dialog promise, which has to be resolved
                // first by clicking "Confirm"
                var updatePromise = dialog.then(function(val){
                    return $scope.organization.$update();
                });
            } else {
                updatePromise = $scope.organization.$update();
            }
            updatePromise.then(function(response){
                $scope.organization = response;
                Notify.alert('Billing Preference Saved', {status: 'success'});
                $scope.allowSave = false;
                $scope.loading = false;
                $scope.initialBillingPreference = _.clone($scope.organization.billingPreference);
            }, function(response){
                Notify.alert(response.data.message, {status: 'danger'});
                $scope.loading = false;
            });
        };

        /**
         * Handler for Stripe new card form.
         * Gets called by angular-payments directive after it calls Stripe to get token, so
         * response.id = token.
         *
         * Handles both Customer & Account token saving, will toggle based on $scope.orgType
         *
         * Current logic is to save to 'Account' if orgType === 'publisher', and save to
         * 'Customer' if orgType === 'advertiser' or 'networkAdmin' or anything else
         *
         * `accountType` param is only for bank account form
         */
        $scope.addToken = function(status, response, verificationData){
            $scope.loading = true;
            if(response.error) {
                $scope.loading = false;
                Notify.alert('Stripe encountered the following error: ' + response.error.message, {status: 'danger'});
            } else {
                // first update org to save billing preference
                $scope.organization.$update().then(function(org){
                    if ($scope.orgType === 'publisher'){
                        // if orgType is Publisher, need to save token to stripe Account object
                        return $scope.organization.$saveStripeTokenToAccount({
                            stripeToken: response.id,
                            accountType: verificationData.accountType,
                            dob: verificationData.dob
                        });
                    } else {
                        // if orgType is advertiser or networkAdmin, need to save token to
                        // Customer object, so call Customer endpoint
                        return $scope.organization.$saveStripeTokenToCustomer({ stripeToken: response.id });
                    }
                }).then(function(response){
                    // now handle post-save steps
                    $scope.organization = response;
                    $scope.loading = false;

                    if ($scope.orgType === 'publisher'){
                        var notifyText = 'Your bank account has been saved! Your monthly balance will be deposited to ' +
                            'this account automatically.';
                    } else {
                        notifyText = 'Your credit card has been saved, thanks! When you run a campaign, this card will be billed automatically.';
                    }

                    Notify.alert(notifyText, {status: 'success'});
                    // update default card setting
                    getStripeCustomerOrAccount();
                    // close form
                    $scope.showStripeForm = false;
                }, function(response){
                    $scope.loading = false;
                    Notify.alert(response.data.message, {status: 'danger'});
                });
            }
        };

        /**
         * Open FAQ's
         */
        $scope.openFaqs = function(){
            var templates = {
                advertiser: "modules/users/views/settings/partials/advertiser-billing-faqs.html",
                publisher: "modules/users/views/settings/partials/publisher-billing-faqs.html"
            };
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: templates[$scope.orgType]
            });
        }
    }
]);