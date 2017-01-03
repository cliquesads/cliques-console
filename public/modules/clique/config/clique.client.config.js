'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Cliques', 'clique', null, '/clique', false, ['networkAdmin'], 2, 'icon-share');
        // Menus.addMenuItem('sidebar', 'Browse Sites', 'browse-sites', null, '/browse-sites', false, ['networkAdmin','advertiser'], 2, 'icon-book-open');

        Menus.addMenuItem('sidebar', 'Browse Publishers', 'browse-sites', null, '/browse-sites', false, ['networkAdmin','advertiser'], 2, 'icon-book-open');

	}
]);