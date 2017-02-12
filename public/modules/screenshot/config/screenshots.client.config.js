/* jshint node: true */
'use strict';

angular.module('screenshot').run(['Menus',
	function(Menus) {
		// Set top bar menu items
		Menus.addMenuItem('sidebar', 'Screenshots', 'screenshots', null, 'app.screenshot.viewScreenshots', false, ['networkAdmin', 'publisher', 'advertiser'], 5, 'fa fa-camera-retro');
	}
]);