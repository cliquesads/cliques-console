'use strict';

angular.module('publisher').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        //Menus.addMenuItem('sidebar', 'Publishers', 'publisher', null, 'app.listPublisher', false, ['admin','publisher'], 2, 'icon-book-open');
        Menus.addMenuItem('sidebar', 'Sites', 'all-sites', null, 'app.publisher.allPublishers.viewPublisher', false, ['networkAdmin','publisher'], 2, 'fa fa-bookmark-o');
        Menus.addSubMenuItem('sidebar', 'all-sites', 'New Publisher', 'publisher/create');
	}
]);