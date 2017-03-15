'use strict';

angular.module('accesscode').controller('ListAccessCodeController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'AccessCode','ngDialog','$state',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, AccessCode, ngDialog, $state) {
        $scope.accessCodes = AccessCode.query();

        $scope.feeTypeFilter = function(type){
            return function(value, index, array){
                return value.type === type;
            };
        };

        $scope.goToAccessCode = function(accessCode){
            $state.go('app.admin.listAccessCodes.viewAccessCode', {
                accessCodeId: accessCode._id
            });
        };

        $scope.newAccessCode = function(){
            ngDialog.open({
                template: 'modules/accesscode/views/partials/create-access-form-dialog.html',
                className: 'ngdialog-theme-default dialogwidth650',
                controller: ['$scope','AccessCode', function($scope, AccessCode){
                    $scope.accessCode = new AccessCode({
                        active: true,
                        code: null,
                        fees: [{
                            type: 'advertiser',
                            percentage: 0.10
                        },
                            {
                                type: 'publisher',
                                percentage: 0.10
                            }]
                    });
                    $scope.submit = function(){
                        $scope.loading = true;
                        $scope.error = null;
                        if ($scope.accessCodeForm.$valid){
                            $scope.accessCode.$create(function(response){
                                $scope.loading = false;
                                Notify.alert('Access code ' + $scope.accessCode.code + 'created', {status: 'success'});
                                $scope.closeThisDialog('success');
                            }, function(errorResponse){
                                $scope.loading = false;
                                $scope.error = errorResponse.data.message;
                            });
                        } else {
                            $scope.loading = false;
                        }

                    };
                }]
            });
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
]).controller('ViewAccessCodeController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'accessCode','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, accessCode, ngDialog) {
        $scope.accessCode = accessCode;
        $scope.organizations = Organizations.query();

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
