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
		state('app.screenshot.viewScreenshots', {
			url: '/screenshots',
			title: 'Screenshots',
			resolve: {
				$title: function(){ return 'Screenshots'; }
			},
			views: {
				'main': {
					templateUrl: 'modules/screenshot/views/screenshots.client.view.html',
					controller: 'ScreenshotController'
				},
				'titleBar': {
					template: 'Screenshots Showcase'
				}
			}
		});
	}
]);