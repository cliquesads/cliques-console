'use strict';

angular.module('publisher').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Publishers', 'publisher', null, 'app.listPublisher', false, ['admin','publisher'], 2, 'icon-book-open');
        Menus.addSubMenuItem('sidebar', 'publisher', 'New Publisher', 'publisher/create');
        Menus.addMenuItem('sidebar', 'Sites', 'publisher/site', null, 'app.listSite', false, ['admin','publisher'], 2);
	}
]);