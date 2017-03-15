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

        $scope.deleteAccessCode = function(accessCode){
            var dialog = ngDialog.openConfirm({
                template: '\
                        <br>\
                        <p>Are you sure you want to delete this access code? This is irreversible!</p>\
                        <p class="text-center">\
                            <button class="btn btn-lg btn-success" ng-click="confirm(true)">Yes</button>\
                            <button class="btn btn-lg btn-primary" ng-click="closeThisDialog()">No</button>\
                        </p>',
                plain: true
            });
            dialog.then(function(confirm){
                if (confirm){
                    accessCode.$delete(function(response){
                        Notify.alert('Access code ' + accessCode.code + 'was deleted successfully', {status: 'success'});
                        _.remove($scope.accessCodes, function(ac){
                            return ac._id === accessCode._id;
                        });
                    }, function(errorResponse){
                        Notify.alert(errorResponse.data.message, {status: 'danger'});
                    });
                }
            });
        };

        $scope.newAccessCode = function(){
            ngDialog.open({
                template: 'modules/accesscode/views/partials/create-access-form-dialog.html',
                className: 'ngdialog-theme-default dialogwidth650',
                controller: ['$scope','AccessCode', function(scope, AccessCode){
                    scope.accessCode = new AccessCode({
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
                    scope.submit = function(){
                        scope.loading = true;
                        scope.error = null;
                        if (scope.accessCodeForm.$valid){
                            scope.accessCode.$create(function(response){
                                scope.loading = false;
                                Notify.alert('Access code ' + scope.accessCode.code + 'created', {status: 'success'});
                                scope.closeThisDialog(response);
                                $scope.accessCodes.splice(0, 0, response);
                            }, function(errorResponse){
                                scope.loading = false;
                                scope.error = errorResponse.data.message;
                            });
                        } else {
                            scope.loading = false;
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
        $scope.dirty = false;

        $scope._accessCodeInit = angular.copy($scope.accessCode);

        $scope.$watch('accessCode', function(newVal, oldVal){
            if (newVal !== oldVal && oldVal.$resolved){
                if (!angular.equals(newVal, $scope._accessCodeInit)){
                    $scope.dirty = true;
                }
            }
        }, true);

        // TODO: FIX THIS, or find a better way to do it. Could run into
        // TODO: memory problems if you keep copying the object.
        $scope.reset = function(){
            $scope.accessCode = angular.copy($scope._accessCodeInit);
            $scope.dirty = false;
        };

        $scope.submit = function(){
            $scope.loading = true;
            if ($scope.accessCodeForm.$valid){
                $scope.accessCode.$update(function(response){
                    $scope.loading = false;
                    Notify.alert('Access code ' + $scope.accessCode.code + 'updated successfully', {status: 'success'});
                    $scope._accessCodeInit = angular.copy($scope.accessCode);
                    $scope.dirty = false;
                }, function(errorResponse){
                    $scope.loading = false;
                    Notify.alert(errorResponse.data.message, {status: 'danger'});
                });
            } else {
                $scope.loading = false;
            }
        };
    }
]);
