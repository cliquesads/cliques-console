angular.module('payments').controller('PaymentAdminController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'Payment','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, Payment, ngDialog) {
        $scope.payments = Payment.query();
        $scope.organization = Organizations.get({
            organizationId: Authentication.user.organization._id
        });


        // holds payment being previewed / edited when it's selected
        $scope.previewPayment = null;
        $scope.isPreview = false;
        $scope.invoicePreviewUrl = null;

        $scope.getTotalAmounts = function(payments){
            return _.sumBy(payments, 'totalAmount');
        };

        $scope.showPreview = function(payment){
            $scope.isPreview = true;
            $scope.previewPayment = payment;
            $scope.invoicePreviewUrl = '/console/payment/' + payment._id + '/invoicePreview';
        };

        $scope.showStatement = function(payment){
            $scope.isPreview = false;
            $scope.previewPayment = payment;
            $scope.invoicePreviewUrl = '/console/payment/' + payment._id + '/viewInvoice';
        };

        $scope.closePreview = function(){
            $scope.previewPayment = null;
            $scope.invoicePreviewUrl = null;
        };

        var openErrorDialog = function(error){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth600',
                template: '<br>\
                         <div class="alert alert-danger text-md">\
                            <p class="text-md"><i class="fa fa-lg fa-exclamation-circle"></i><strong>An error occurred.</strong></p>\
                            <p>' + error.data.message + '</p>\
                        </div>',
                plain: true
            });
        };

        $scope.approveAndSend = function(payment){
            var dialog = ngDialog.openConfirm({
                template: '\
                        <br>\
                        <p>Email invoice to Organization as well?</p>\
                        <p class="text-center">\
                            <button class="btn btn-lg btn-success" ng-click="confirm(true)">Yes</button>\
                            <button class="btn btn-lg btn-primary" ng-click="confirm(false)">No, just generate the invoice.</button>\
                            <button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
                        </p>',
                plain: true
            });
            // Wrap $update promise in dialog promise, which has to be resolved
            // first by clicking "Confirm"
            dialog.then(function(sendToOrg){
                payment.status = "Pending";
                var pendingDialog = ngDialog.open({
                    className: 'ngdialog-theme-default dialogwidth600',
                    template: '<br>\
                        <div class="row">\
                            <div class="ball-grid-pulse"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>\
                            <h4>&nbsp; Approving & Sending Invoices, please hold...</h4>\
                        </div>',
                    plain: true
                });

                payment.$update().then(function(updated){
                    var postUrl = '/console/payment/' + payment._id + '/generateAndSendInvoice';
                    // add query param email=true if sendToOrg is true
                    if (sendToOrg){
                        postUrl += '?email=true'
                    }
                    return $http.post(postUrl).success(function(response){
                        pendingDialog.close(0);
                        // set invoicePath on resource
                        payment.invoicePath = response.invoicePath;
                        ngDialog.open({
                            className: 'ngdialog-theme-default dialogwidth600',
                            template: '<br>\
                                 <div class="alert alert-success text-md">\
                                    <p class="text-md"><i class="fa fa-lg fa-exclamation-circle"></i><strong> Success!</strong></p>\
                                    <p> Status has been updated & invoices were generated and sent. </p>\
                                </div>',
                            plain: true
                        });
                        $scope.closePreview();
                    }).error(function(response){
                        pendingDialog.close(1);
                        openErrorDialog(response)
                    });
                }, function(err){
                    pendingDialog.close(1);
                    openErrorDialog(err);
                });
            });
        };

        $scope.setPaid = function(payment){
            var dialog = ngDialog.openConfirm({
                template: '\
                        <br>\
                        <p>Are you sure you want to mark this payment as Paid? This is irreversible!</p>\
                        <p class="text-center">\
                            <button class="btn btn-lg btn-success" ng-click="confirm(true)">Yes</button>\
                            <button class="btn btn-lg btn-primary" ng-click="closeThisDialog()">No</button>\
                        </p>',
                plain: true
            });

            dialog.then(function(confirm){
                if (confirm){
                    var pendingDialog = ngDialog.open({
                        className: 'ngdialog-theme-default dialogwidth600',
                        template: '<br>\
                        <div class="row">\
                            <div class="ball-grid-pulse"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>\
                            <h4>&nbsp; Setting payment to Paid, please hold...</h4>\
                        </div>',
                        plain: true
                    });

                    var patchUrl = '/console/payment/' + payment._id + '/setPaid';
                    // TODO: can't set payment as response so just changing status to paid client-side instead
                    payment.status = "Paid";
                    return $http.patch(patchUrl).success(function(response){
                        pendingDialog.close(0)
                    }).error(function(response){
                        openErrorDialog(response)
                    });
                }
            });
        };

        // fetch status types constant from server for convenience
        $http.get('/console/payment-statuses/').success(function(response){
            // remove 'Paid' status, make user have to use the "Set Paid" workflow to
            // set status to Paid since there are some extra server hooks that need to be performed.
            var i = _.findIndex(response, function(s){ return s === 'Paid' });
            response.splice(i, 1);
            $scope.statuses = response;
        }).error(function(response){
            console.error(response.data.message);
        });

        /**
         * Opens up dialog which allows you to change the status of an invoice without
         * "approving and sending"
         * @param payment
         */
        $scope.openStatusDialog = function(payment){
            var initialStatus = _.clone(payment.status);
            ngDialog.open({
                template: 'modules/payments/views/partials/status-change-dialog.html',
                className: 'ngdialog-theme-default dialogwidth650',
                data: {
                    payment: payment,
                    statuses: $scope.statuses
                },
                controller: ['$scope','$http', function($scope, $http) {
                    $scope.payment = $scope.ngDialogData.payment;
                    $scope.statuses = $scope.ngDialogData.statuses;
                    $scope.submit = function(){
                        $scope.loading = true;
                        $scope.payment.$update().then(function(payment){
                            $scope.loading = false;
                            $scope.closeThisDialog('success');
                        }, function(response){
                            $scope.loading = false;
                            $scope.error = response.data.message;
                        });
                    };
                }],
                preCloseCallback: function(value){
                    // clear changes if not saved successfully
                    if (value != 'success'){
                        $scope.$apply(function(){
                            payment.status = initialStatus;
                        });
                    }
                }
            });
        };

        /**
         * Opens up adjustment editor
         * @param payment
         */
        $scope.openAdjustmentsDialog = function(payment){
            var initialAdjustments = _.clone(payment.adjustments);
            ngDialog.open({
                template: 'modules/payments/views/partials/adjustments-dialog.html',
                className: 'ngdialog-theme-default dialogwidth650',
                data: {
                    payment: payment
                },
                controller: ['$scope','$http', function($scope, $http) {
                    $scope.payment = $scope.ngDialogData.payment;
                    if ($scope.payment.adjustments.length === 0){
                        $scope.payment.adjustments.push({});
                    }

                    $scope.remove = function(adjustment){
                        _.remove($scope.payment.adjustments, adjustment);
                    };

                    $scope.submit = function(){
                        $scope.loading = true;
                        $scope.payment.$update().then(function(payment){
                            $scope.loading = false;
                            $scope.closeThisDialog('success');
                        }, function(response){
                            $scope.loading = false;
                            $scope.error = response.data.message;
                        });
                    };
                }],
                preCloseCallback: function(value){
                    // clear changes if not saved successfully
                    if (value != 'success'){
                        $scope.$apply(function(){
                            payment.adjustments = initialAdjustments;
                        });
                    }
                }
            });
        };
    }
]);