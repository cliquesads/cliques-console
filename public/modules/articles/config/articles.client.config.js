'use strict';

// Configuring the Articles module
angular.module('articles').run(['Menus',
	function(Menus) {
		// Set top bar menu items
		Menus.addMenuItem('sidebar', 'Articles', 'articles', 'dropdown', '/articles(/.*)?', false, null, 20);
		Menus.addSubMenuItem('sidebar', 'articles', 'List Articles', 'articles');
		Menus.addSubMenuItem('sidebar', 'articles', 'New Article', 'articles/create');
	}
]);