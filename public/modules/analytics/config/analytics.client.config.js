'use strict';

angular.module('actionbeacon').run(['Menus', 
	function(Menus) {
		Menus.addMenuItem(
			'sidebar',
			'Analytics',
			'analytics',
			null,
			'app.analytics',
			false,
			['networkAdmin','advertiser'],
			5,
			'fa fa-signal'
		);
	}
]);