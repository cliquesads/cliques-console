'use strict';

angular.module('admin').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Admin', 'admin', null, 'app.admin.main', false, ['networkAdmin'], 7, 'icon-settings');
        Menus.addSubMenuItem('sidebar', 'admin', 'Network Report', 'admin/network-report');
        Menus.addSubMenuItem('sidebar', 'admin', 'Payments & Billing', 'admin/payment-admin');
	}
]);