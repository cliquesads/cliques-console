/* globals deploymentMode */
'use strict';

angular.module('admin').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Admin', 'admin', null, 'app.admin.main', false, ['networkAdmin'], 7, 'icon-settings');
        Menus.addSubMenuItem('sidebar', 'admin', 'Payments & Billing', 'admin/payment-admin', null, null, null, null, 'fa fa-dollar');
        Menus.addSubMenuItem('sidebar', 'admin', 'Organization Invites', 'admin/access-link', null, null, null, null, 'fa fa-envelope');
        Menus.addSubMenuItem('sidebar', 'admin', 'Salespeople', 'admin/salespeople', null, null, null, null, 'fa fa-user');
	}
]);