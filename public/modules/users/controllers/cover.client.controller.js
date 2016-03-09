'use strict';

angular.module('users').controller('SettingsCoverController', ['$scope', '$http', '$location', 'Users',
    'Authentication','FileUploader','ngDialog','LOGO',
    function($scope, $http, $location, Users, Authentication, FileUploader, ngDialog, LOGO) {
        $scope.user = Authentication.user;
        $scope.defaultUrl = LOGO.default_secure_url;

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
            url: '/users/avatar'
        });

        // Hook for update method after upload complete
        // Gets wrapped in ngDialog with close method, so add as private
        // method here.
        $scope.uploader._onCompleteAll = function(){
            $scope.updateUser();
        };

        $scope.size = $scope.size || 'lg';
        $scope.default_url = LOGO.default_secure_url;
        $scope.openUploader = function(){
            ngDialog.open({
                template: '<h4>Upload a profile picture</h4><avatar-uploader model="model" uploader="uploader" onremove="onremove()"></avatar-uploader>',
                plain: true,
                data: { user: $scope.user, uploader: $scope.uploader, onremove: $scope.updateUser },
                controller: ['$scope', function ($scope) {
                    $scope.model = $scope.ngDialogData.user;

                    // wrap onCompleteAll in function that closes dialog as well
                    $scope.ngDialogData.uploader.onCompleteAll = function(){
                        $scope.ngDialogData.uploader._onCompleteAll();
                        $scope.closeThisDialog('Success');
                    };

                    $scope.uploader = $scope.ngDialogData.uploader;
                    $scope.onremove = $scope.ngDialogData.onremove;
                }]
            });
        };

    }
]);