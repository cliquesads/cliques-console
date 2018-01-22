'use strict';

angular.module('article').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addSubMenuItem('sidebar', 'admin', 'Article Recommendations', 'admin/article-recommendations');
	}
]);