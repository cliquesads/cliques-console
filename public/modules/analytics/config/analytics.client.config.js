'use strict';

angular.module('analytics').run(['Menus',
	function(Menus) {
		Menus.addMenuItem(
			'sidebar',
			'Analytics',
			'analytics',
			null,
			'app.analytics.quickQueries',
			false,
			['networkAdmin','advertiser','publisher'],
			4,
			'fa fa-signal'
		);
	}
]);