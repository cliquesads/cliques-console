angular.module('core').directive('logoWidget', [
    'FileUploader',
    'ngDialog',
    'LOGO',
    function(FileUploader,ngDialog,LOGO){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                model: '=',
                oncompleteall: '&',
                onremove: '&',
                size: '@'
            },
            template: '<img class="client-logo-{{ size }}" ng-src="{{ model.logo_secure_url || default_url }}" ng-click="openUploader()"/>',
            link: function(scope, element, attrs){
                var uploader = scope.uploader = new FileUploader({
                    url: '/logos'
                });
                scope.size = scope.size || 'md';
                scope.default_url = LOGO.default_secure_url;
                scope.openUploader = function(){
                    ngDialog.open({
                        template: '<h4>Upload a New Logo</h4><logo-uploader model="model" uploader="uploader" onremove="onremove()"></logo-uploader>',
                        plain: true,
                        data: {model: scope.model, uploader: scope.uploader },
                        controller: ['$scope', function ($scope) {
                            $scope.model = $scope.ngDialogData.model;
                            $scope.uploader = $scope.ngDialogData.uploader;
                            $scope.onremove = scope.onremove;
                        }]
                    });
                };

                // Hook for update method after upload complete
                scope.uploader.onCompleteAll = function(){
                    return scope.oncompleteall();
                };
            }
        };
    }
]);

