'use strict';

// Setting up route
angular.module('articles').config(['$stateProvider',
	function($stateProvider) {
		// Articles state routing
		$stateProvider.
		state('app.listArticles', {
			url: '/articles',
			title: 'List Articles',
			templateUrl: 'modules/articles/views/list-articles.client.view.html'
		}).
		state('app.createArticle', {
			url: '/articles/create',
			title: 'New Article',
			templateUrl: 'modules/articles/views/create-article.client.view.html'
		}).
		state('app.viewArticle', {
			url: '/articles/:articleId',
			title: 'View Article',
			templateUrl: 'modules/articles/views/view-article.client.view.html',
			controller: 'ArticlesController'
		}).
		state('app.editArticle', {
			title: 'Edit Article',
			url: '/articles/:articleId/edit',
			templateUrl: 'modules/articles/views/edit-article.client.view.html'
		});
	}
]);