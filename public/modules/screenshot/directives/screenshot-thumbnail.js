angular.module('screenshot').directive('screenshotThumbnail', [
    '$state',
    function($state) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                screenshot: '=',
                demo: '@'
            },
            templateUrl: 'modules/screenshot/views/partials/screenshot-thumbnail.client.view.html',
            link: function (scope, element, attrs) {
                scope.viewScreenshot = function(screenshot){
                    $state.go('app.screenshot.listScreenshots.viewScreenshot', { screenshotId: screenshot._id });
                };
            }
        };
    }
]);
