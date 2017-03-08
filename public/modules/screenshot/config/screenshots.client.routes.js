/* jshint node: true */
'use strict';

// Setting up route
angular.module('screenshot').config(['$stateProvider', 
	function($stateProvider) {
		// Screenshot state routing
		$stateProvider.
		state('app.screenshot', {
			title: 'Screenshot',
			abstract: true,
			templateUrl: 'modules/screenshot/views/screenshot-layout.client.view.html'
		}).
		state('app.screenshot.listScreenshots', {
			url: '/screenshots',
			title: 'Screenshots',
			resolve: {
				$title: function(){ return 'Screenshots'; }
			},
			views: {
				'main': {
					templateUrl: 'modules/screenshot/views/list-screenshots.client.view.html',
					controller: 'ListScreenshotsController'
				}
			}
		}).
		state('app.screenshot.listScreenshots.viewScreenshot', {
			url: '/:screenshotId',
			title: 'Screenshots',
			resolve: {
				screenshot: function($stateParams, Screenshot){
					return Screenshot.get({ screenshotId: $stateParams.screenshotId }).$promise;
				},
				$title: function(screenshot){
					return screenshot.advertiser.name + ' / ' + screenshot.publisher.name;
				}
			},
			views: {
				'main': {
					templateUrl: 'modules/screenshot/views/view-screenshot.client.view.html',
					controller: 'ScreenshotController'
				}
			}
		});
	}
]);