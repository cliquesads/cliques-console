angular.module('payments').controller('PaymentAdminController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'Payment','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, Payment, ngDialog) {
        $scope.payments = Payment.query();

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
            if ($scope.previewPayment.status === 'Needs Approval'){
                $scope.invoicePreviewUrl = '/console/payment/' + payment._id + '/invoicePreview'
            } else {
                $scope.invoicePreviewUrl = payment.invoiceUrl;
            }
        };

        $scope.closePreview = function(){
            $scope.previewPayment = null;
            $scope.invoicePreviewUrl = null;
        };

        /**
         * Calls approve & send endpoint
         * @param payment
         */
        $scope.approveAndSend = function(payment){
            payment.status = "Pending";
            var pendingDialog = ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth600',
                template: '<br>\
                        <div class="row">\
                            <div class="ball-grid-pulse"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>\
                            <h4> Approving & Sending Invoices, please hold...</h4>\
                        </div>',
                plain: true
            });

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
            payment.$update().then(function(payment){
                var postUrl = '/console/payment/' + payment._id + '/generateAndSendInvoice';
                return $http.post(postUrl).success(function(response){
                    pendingDialog.close(0);
                    ngDialog.open({
                        className: 'ngdialog-theme-default dialogwidth600',
                        template: '<br>\
                     <div class="alert alert-success text-md">\
                        <p class="text-md"><i class="fa fa-lg fa-exclamation-circle"></i><strong> Success!</strong></p>\
                        <p> Status has been updated & invoices were generated and sent. </p>\
                    </div>',
                        plain: true
                    });
                }).error(function(response){
                    pendingDialog.close(1);
                    openErrorDialog(response)
                });
            }, function(err){
                pendingDialog.close(1);
                openErrorDialog(err);
            });
        };

        // fetch status types constant from server for convenience
        $http.get('/console/payment-statuses/').success(function(response){
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