'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Advertiser', 'advertiser', null, '/advertiser', false, ['admin','advertiser'], 2, 'icon-bar-chart');
	}
]);