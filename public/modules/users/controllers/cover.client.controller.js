'use strict';

angular.module('users').controller('SettingsCoverController', ['$scope', '$http', '$location', 'Users',
    'Authentication','FileUploader','ngDialog','userIdenticon',
    function($scope, $http, $location, Users, Authentication, FileUploader, ngDialog, userIdenticon) {
        $scope.user = Authentication.user;
        $scope.userIdenticon = userIdenticon;

        $scope.updateUser = function(){
            var user = new Users($scope.user);
            user.$update(function(response) {
                $scope.success = true;
                Authentication.user = response;
                $scope.user = response;
            }, function(response) {
                $scope.error = response.data.message;
            });
        };

        var uploader = $scope.uploader = new FileUploader({
            url: 'console/users/avatar'
        });

        // Hook for update method after upload complete
        // Gets wrapped in ngDialog with close method, so add as private
        // method here.
        $scope.uploader._onCompleteAll = function(){
            $scope.updateUser();
        };

        $scope.size = $scope.size || 'lg';
        $scope.openUploader = function(){
            ngDialog.open({
                template: '<h4>Upload a profile picture</h4><avatar-uploader model="model" uploader="uploader" ' +
                    'on-remove="onRemove()" on-upload-success="onUploadSuccess()"></avatar-uploader>',
                plain: true,
                className: 'ngdialog-theme-default dialogwidth650',
                data: {
                    user: $scope.user,
                    uploader: $scope.uploader,
                    onRemove: $scope.updateUser,
                    onUploadSuccess: $scope.updateUser
                },
                controller: ['$scope', function ($scope) {
                    $scope.model = $scope.ngDialogData.user;

                    // wrap onCompleteAll in function that closes dialog as well
                    $scope.onUploadSuccess = function(){
                        $scope.ngDialogData.onUploadSuccess();
                        $scope.closeThisDialog('Success');
                    };

                    $scope.uploader = $scope.ngDialogData.uploader;
                    $scope.onRemove = function(){
                        $scope.ngDialogData.onremove();
                        $scope.closeThisDialog('Success');
                    };
                }]
            });
        };
    }
]);