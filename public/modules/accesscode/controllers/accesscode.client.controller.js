'use strict';

angular.module('accesscode').controller('AccessCodeController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'AccessCode','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, AccessCode, ngDialog) {
        $scope.accessCodes = AccessCode.query();

        $scope.feeTypeFilter = function(type){
            return function(value, index, array){
                return value.type === type;
            };
        };

        $scope.openSendDialog = function(accessCode){
            ngDialog.openConfirm({
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
        };
    }
]);
