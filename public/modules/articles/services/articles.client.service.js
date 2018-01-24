'use strict';

angular.module('article').factory('Article', ['$resource', function($resource) {
	return $resource('/console/article/:articleId', { articleId: '@_id' },
		{
			query: { method: 'GET', isArray: false },
			update: { method: 'PATCH'},
			create: { method: 'POST'},
			updateOrCreate: { method: 'PUT'}
		}
	);
}]);
