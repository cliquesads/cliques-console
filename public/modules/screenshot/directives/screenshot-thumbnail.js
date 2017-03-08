angular.module('screenshot').directive('screenshotThumbnail', [
    'ngDialog',
    function(ngDialog) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                screenshot: '='
            },
            templateUrl: 'modules/screenshot/views/partials/screenshot-thumbnail.client.view.html',
            link: function (scope, element, attrs) {
                scope.viewScreenshot = function(screenshot){
                    ngDialog.open({
                        template: 'modules/screenshot/views/partials/screenshot-dialog.html',
                        data: { screenshot: screenshot },
                        className: 'ngdialog-theme-default dialogwidth800',
                        controller: 'ScreenshotDialogController'
                    });
                };
            }
        };
    }
]);
