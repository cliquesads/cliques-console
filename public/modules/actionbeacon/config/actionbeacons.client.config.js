'use strict';

angular.module('actionbeacon').run(['Menus', 
	function(Menus) {
		Menus.addMenuItem(
			'sidebar',
			'Action Beacons',
			'actionbeacon/list-actionbeacons',
			null,
			'app.listActionbeacons',
			false,
			['networkAdmin','advertiser'],
			4,
			'fa fa-podcast'
		);
	}
]);