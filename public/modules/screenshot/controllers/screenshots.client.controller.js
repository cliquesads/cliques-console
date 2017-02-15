/* global _, angular, user */
'use strict';

angular.module('screenshot').controller('ScreenshotController', ['$scope', 'Advertiser', 'ScreenshotFetcher', 'Notify', 'ngDialog',
	function($scope, Advertiser, ScreenshotFetcher, Notify, ngDialog) {
		$scope.numberOfScreenshotGroups = 0;

		ScreenshotFetcher.fetchByAdvertisers(true)
		.then(function(response) {
		    $scope.groupedScreenshots = response.data;
		    for (var key in $scope.groupedScreenshots) {
		    	if ($scope.groupedScreenshots.hasOwnProperty(key)) {
		    		$scope.numberOfScreenshotGroups ++;
		    	}
		    }
		}, function(errorResponse) {
		    Notify.alert(errorResponse.data.message, {status: 'danger'});
		});

		$scope.viewScreenshot = function(screenshot){
		    ngDialog.open({
		        template: 'modules/core/views/partials/screenshot-dialog.html',
		        data: { screenshotUrl: screenshot.image_url },
		        className: 'ngdialog-theme-default dialogwidth800'
		    });
		};
	}
]);