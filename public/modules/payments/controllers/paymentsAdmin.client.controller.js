angular.module('payments').controller('PaymentAdminController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'Payment','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, Payment, ngDialog) {
        $scope.payments = Payment.query();

        // holds payment being previewed / edited when it's selected
        $scope.previewPayment = null;
        $scope.isPreview = false;
        $scope.invoicePreviewUrl = null;

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

        };

        /**
         * Opens up dialog which allows you to change the status of an invoice without
         * "approving and sending"
         * @param payment
         */
        $scope.openStatusDialog = function(payment){

        };

        /**
         * Opens up adjustment editor
         * @param payment
         */
        $scope.openAdjustmentsDialog = function(payment){

        };
    }
]);