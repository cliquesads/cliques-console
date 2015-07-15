'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Cliques', 'clique', null, '/clique', false, ['admin'], 2, 'icon-share');
	}
]);