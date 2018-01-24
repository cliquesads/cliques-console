'use strict';

angular.module('admin').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Admin', 'admin', null, 'app.admin.main', false, ['networkAdmin'], 7, 'icon-settings');
        Menus.addSubMenuItem('sidebar', 'admin', 'Payments & Billing', 'admin/payment-admin', null, null, null, null, 'fa fa-dollar');
        Menus.addSubMenuItem('sidebar', 'admin', 'Access Codes', 'admin/access-codes',null, null, null, null, 'fa fa-envelope');
	}
]);