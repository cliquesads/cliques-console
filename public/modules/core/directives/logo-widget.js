angular.module('core').directive('logoWidget', [
    'FileUploader',
    'ngDialog',
    'LOGO',
    function(FileUploader,ngDialog,LOGO){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                model: '='
            },
            templateUrl: 'modules/core/views/partials/logo-widget.html',
            link: function(scope, element, attrs){
                var uploader = scope.uploader = new FileUploader({
                    url: '/logos'
                });
                scope.default_url = LOGO.default_url;
                console.log(scope.default_url);
                console.log(scope.model);
                scope.openUploader = function(){
                    ngDialog.open({
                        template: '<logo-uploader model="model" uploader="uploader"></logo-uploader>',
                        plain: true,
                        data: {model: scope.model, uploader: scope.uploader },
                        controller: ['$scope', function ($scope) {
                            $scope.model = $scope.ngDialogData.model;
                            $scope.uploader = $scope.ngDialogData.uploader;
                        }]
                    });
                }
            }
        };
    }
]);

