'use strict';

angular.module('users').controller('BillingController', ['$scope', '$http', '$location', '$analytics', 'Users', 'Authentication','Notify',
    'Organizations', 'Payment','ngDialog',
    function($scope, $http, $location, $analytics, Users, Authentication,Notify, Organizations, Payment, ngDialog) {
        $scope.user = Authentication.user;

        /**
         * Load stripe Customer object associated w/ Organization, if applicable
         */
        var getStripeCustomerOrAccount = function(){
            // temporary organization copy to use to call stripe API endpoints so $scope.organization isn't overwritten
            var org = new Organizations($scope.organization);
            // get Customer for advertisers AND networkAdmins
            if ($scope.organization.effectiveOrgType === 'advertiser' || $scope.organization.effectiveOrgType === 'networkAdmin'){
                if ($scope.organization.stripeCustomerId){
                    org.$getStripeCustomer().then(function(customer){
                        $scope.defaultSource = customer.sources.data.filter(function(source){
                            return source.id === customer.default_source;
                        })[0];
                    }, function(response){
                        console.error(response.data.message);
                    });
                }
                // get Account for publishers
            } else if ($scope.organization.effectiveOrgType === 'publisher'){
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

        var organization = $scope.organization = Organizations.get({
            organizationId: Authentication.user.organization._id
        }, function(response){
            getStripeCustomerOrAccount();
        });

        // get all payments to populate billing history
        $scope.payments = Payment.query();

        // control variable for CC add form toggling
        $scope.showStripeForm = false;

        // Stripe form "loading" glyph control var
        $scope.loading = false;

        $scope.showInvoice = function(payment){
            var invoiceUrl = '/console/payment/' + payment._id + '/viewInvoice';
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: '<iframe src="' + invoiceUrl + '" class="invoice" frameborder="0">',
                plain: true
            });
        };

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
            if (newValue !== $scope.initialBillingPreference){
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
            var updatePromise;
            if ($scope.organization.billingPreference === 'Check' && $scope.organization.effectiveOrgType === 'advertiser'){
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
                updatePromise = dialog.then(function(val){
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
         * Opens error dialog after trying to submit account / card info to
         * stripe & save to account or customer
         * @param errorMessage
         * @returns {*}
         */
        var openErrorDialog = function(errorMessage){
            return ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth600',
                template: '<br>\
                        <div class="alert alert-danger">\
                            <p class="text-md"><strong><i class="fa fa-lg fa-exclamation-circle"></i> Stripe encountered the following error:</strong></p>\
                            <p>' + errorMessage + '</p>\
                            <p> We\'re sorry about this.  Please contact us at <a href="mailto:support@cliquesads.com">\
                            support@cliquesads.com</a> and include a reference to the error above.</p>\
                        </div>',
                plain: true
            });
        };

        /**
         * Handler for Stripe new card form.
         * Gets called by angular-payments directive after it calls Stripe to get token, so
         * response.id = token.
         */
        $scope.addTokenToCustomer = function(status, response, loadingDialog){
            // Customer-specific success dialog function
            var openSuccessDialog = function(){
                return ngDialog.open({
                    className: 'ngdialog-theme-default dialogwidth600',
                    template: '<br>\
                        <div class="alert alert-success text-md">\
                            <p class="text-md"><i class="fa fa-lg fa-exclamation-circle"></i><strong> Success!</strong></p>\
                            <p> Your credit card has been saved, thanks! When you run a campaign, this card will be billed automatically. </p>\
                        </div>',
                    plain: true
                });
            };

            if(response.error) {
                $analytics.eventTrack('BillingSettings_CardTokenError');
                loadingDialog.close(1);
                openErrorDialog(response.error.message);
            } else {
                // first update org to save billing preference
                $scope.organization.$update().then(function(org){
                    return $scope.organization.$saveStripeTokenToCustomer({ stripeToken: response.id });
                }).then(function(response){
                    // now handle post-save steps
                    loadingDialog.close(0);
                    openSuccessDialog();
                    $scope.organization = response;
                    // send analytics event for successful card entry
                    $analytics.eventTrack('BillingSettings_CardSaved');
                    // update default card setting
                    getStripeCustomerOrAccount();
                    // close form
                    $scope.showStripeForm = false;
                }, function(response){
                    $analytics.eventTrack('BillingSettings_AddCardTokenToCustomerError');
                    loadingDialog.close(1);
                    openErrorDialog(response.data.message);
                });
            }
        };

        /**
         * Handler for Stripe new bank account form..
         * Gets called by angular-payments directive after it calls Stripe to get token, so
         * response.id = token.
         *
         * This is a little more involved, since account verification may be involved.
         */
        $scope.addTokenToAccount = function(status, response, loadingDialog, verificationData){

            // Account-specific success dialog function
            var openSuccessDialog = function(){
                return ngDialog.open({
                    className: 'ngdialog-theme-default dialogwidth600',
                    template: '<br>\
                        <div class="alert alert-success text-md">\
                            <p class="text-md"><i class="fa fa-lg fa-exclamation-circle"></i><strong> Success!</strong></p>\
                            <p> Your bank account has been saved. Your monthly balance will be deposited to this account automatically.</p>\
                            <p><strong>PLEASE NOTE:</strong> We may need reach out to confirm additional account details with you for security purposes.</p>\
                        </div>',
                    plain: true
                });
            };

            if(response.error) {
                $analytics.eventTrack('BillingSettings_BankTokenError');
                loadingDialog.close(1);
                openErrorDialog(response.error.message);
            } else {
                // first update org to save billing preference
                $scope.organization.$update().then(function(org){
                    return $scope.organization.$saveStripeTokenToAccount({
                        stripeToken: response.id,
                        accountType: verificationData.accountType,
                        dob: verificationData.dob
                    });
                }).then(function(response){
                    // now handle post-save steps
                    loadingDialog.close(0);
                    openSuccessDialog();
                    $scope.organization = response;
                    // add analytics event
                    $analytics.eventTrack('BillingSettings_BankInfoSaved');
                    // update default card setting
                    getStripeCustomerOrAccount();
                    // close form
                    $scope.showStripeForm = false;
                }, function(response){
                    $analytics.eventTrack('BillingSettings_AddBankTokenToAccountError');
                    loadingDialog.close(1);
                    openErrorDialog(response.data.message);
                });
            }
        };

        /**
         * Open FAQ's
         */
        $scope.openFaqs = function(){
            var templates = {
                advertiser: "modules/payments/views/partials/advertiser-billing-faqs.html",
                publisher: "modules/payments/views/partials/publisher-billing-faqs.html"
            };
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: templates[$scope.organization.effectiveOrgType]
            });
        };

        /**
         * Handlers for saving minor billing settings
         * @type {boolean}
         */
        $scope.settingsLoading = false;
        $scope.saveSettings = function(){
            $scope.settingsLoading = true;
            $scope.organization.$update().then(function(response){
                $scope.settingsLoading = false;
                Notify.alert('Your settings have been updated.  Thanks!', {status: 'success'});
            }, function(err){
                $scope.settingsLoading = false;
                Notify.alert(err.data.message, {status: 'danger'});
            });
        };
    }
]);