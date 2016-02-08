'use strict';

angular.module('publisher').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        //Menus.addMenuItem('sidebar', 'Publishers', 'publisher', null, 'app.listPublisher', false, ['admin','publisher'], 2, 'icon-book-open');
        Menus.addMenuItem('sidebar', 'My Sites', 'publisher/site', null, 'app.publisher.viewPublisher', false, ['admin','publisher'], 2, 'icon-book-open');
        Menus.addSubMenuItem('sidebar', 'publisher/site', 'New Publisher', 'publisher/create');
	}
]);