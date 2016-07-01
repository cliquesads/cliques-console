angular.module('payments').controller('PaymentAdminController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'Payment','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, Payment, ngDialog) {
        $scope.payments = Payment.query();
        $scope.invoicePreview = false;
        

    }
]);