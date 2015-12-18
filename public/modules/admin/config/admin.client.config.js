'use strict';

angular.module('admin').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Admin', 'admin', null, 'app.admin.main', false, ['admin','advertiser'], 7, 'icon-settings');
	}
]);