'use strict';

angular.module('actionbeacon').run(['Menus', 
	function(Menus) {
		Menus.addMenuItem(
			'sidebar',
			'Action Beacons',
			'actionbeacon',
			null,
			'app.listActionbeacon',
			false,
			['networkAdmin','advertiser'],
			5,
			'fa fa-podcast'
		);
	}
]);