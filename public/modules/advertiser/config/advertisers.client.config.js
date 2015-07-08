'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Advertiser', 'advertiser', null, '/advertiser', true, null, null, 'icon-home');
	}
]);