/* global _, angular, user */
'use strict';

angular.module('screenshot').controller('ScreenshotController', ['$scope', 'Advertiser', 'ScreenshotFetcher', 'Notify', 'ngDialog',
	function($scope, Advertiser, ScreenshotFetcher, Notify, ngDialog) {

		$scope.advertiserIds = [];

		Advertiser.query(function(advertisers) {
			advertisers.forEach(function(adv) {
				$scope.advertiserIds.push(adv._id);
			});
			ScreenshotFetcher.fetchByAdvertiserIds($scope.advertiserIds)
			.then(function(response) {
			    $scope.screenshots = response.data;
			}, function(errorResponse) {
			    Notify.alert(errorResponse.data.message, {status: 'danger'});
			});
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