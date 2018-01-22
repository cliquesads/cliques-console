'use strict';

// Setting up route
angular.module('article').config(['$stateProvider',
	function($stateProvider) {
		// Advertiser state routing
		$stateProvider.
        state('app.article', {
            title: 'Article Recommendations',
            abstract: true,
            templateUrl: 'modules/articles/views/articles-layout.client.view.html'
        }).
        state('app.article.listArticles', {
            url: '/admin/article-recommendations',
            title: 'Article Recommendations',
            resolve: {
                $title: function(){ return 'Article Recommendations'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/articles/views/list-articles.client.view.html',
                    controller: 'ListArticlesController'
                }
            }
        }).
        state('app.article.listArticles.viewArticle', {
            url: '/:articleId',
            title: 'Article',
            resolve: {
                article: function($stateParams, Article){
                    return Article.get({ articleId: $stateParams.articleId }).$promise;
                },
                $title: function(article){
                    return article.site.name + ' : ' + article.meta.opengraph.title;
                }
            },
            views: {
                'main': {
                    templateUrl: 'modules/articles/views/view-article.client.view.html',
                    controller: 'ArticleController'
                }
            }
        });
	}
]);