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
            ngDialog.open({
                template: 'modules/accesscode/views/partials/send-access-code-dialog.html',
                className: 'ngdialog-theme-default dialogwidth650',
                data: {
                    accessCode: accessCode
                },
                controller: ['$scope','$http', function($scope, $http) {
                    $scope.accessCode = $scope.ngDialogData.accessCode;
                    $scope.invites = [{
                        firstName: null,
                        lastName: null,
                        email: null
                    }];
                    $scope.submit = function(){
                        $scope.loading = true;
                        if ($scope.inviteForm.$valid){
                            $http.post('/console/accesscode/' + $scope.accessCode._id + '/send-to-user', $scope.invites)
                                .success(function(response){
                                    Notify.alert('Access codes sent', {status: 'success'});
                                    $scope.loading = false;
                                    $scope.closeThisDialog('success');
                                })
                                .error(function(response){
                                    $scope.loading = false;
                                    Notify.alert(response.message, {status: 'danger'});
                                });
                        } else {
                            $scope.loading = false;
                        }
                    };

                }]
            });
        };
    }
]);
