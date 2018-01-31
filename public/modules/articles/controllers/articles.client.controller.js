/* global _, angular, user */
'use strict';

angular.module('article').controller('ListArticlesController', ['$scope', 'Article', 'Publisher', 'getSitesInCliqueBranch',
	'ROOT_CLIQUE_ID','Notify', 'ngDialog', '$http', '$window', '$state',
	function($scope, Article, Publisher, getSitesInCliqueBranch, ROOT_CLIQUE_ID, Notify, ngDialog, $http, $window, $state) {
		$scope.perPageOptions = [ 5, 10, 25, 50, 100 ];
		$scope.queryParams = {
			per_page: 10,
			site: null,
            sort_by: "meta.article.published_time,desc"
        };
		$scope.articles = [];
		$scope.pagination = {
			count: null,
			pages: null,
			start: 0,
			end: 0
		};

		$scope.recoLimit = 3;

		$scope.sites = [];
		getSitesInCliqueBranch(ROOT_CLIQUE_ID).then(function(response){
			response.data.forEach(function(clique){
				$scope.sites = $scope.sites.concat(clique.sites);
			});
			$scope._sitesObj = _.groupBy($scope.sites, 'id');
        });

		$scope.filterChanged = function(){
			$scope.getArticles();
		};

		$scope.getArticles = function(page) {
			// TODO: $http's returned promise's $resolved property doesn't
			// TODO: exactly behave as expected here so have to manually set resolved flags,
			// TODO: which is really annoying
			$scope.resolved = false;
			$scope.articles = [];
			$scope.queryParams.page = page;
			$scope.articleRequest = Article.query($scope.queryParams).$promise
			.then(function(response) {
				$scope.resolved = true;
				$scope.pagination.count = response.count;
				$scope.pagination.pages = response.pages;
				$scope.pagination.start = response.count ? $scope.queryParams.per_page * ($scope.queryParams.page - 1) + 1 : 0;
				$scope.pagination.end = response.count ? $scope.pagination.start + response.results.length - 1 : 0;

				var articles = response.results;
				articles.forEach(function(article){
                    article.site = $scope._sitesObj[article.site][0];
				});

			    $scope.articles = articles;
			}, function(errorResponse) {
				$scope.resolved = true;
			    Notify.alert(errorResponse.message, {status: 'danger'});
			});
		};
		$scope.getArticles(1);
	}
]).controller('ArticleController', ['$scope', '$window', 'article', 'Publisher','Authentication',
    'Notify','ngDialog','$analytics',
	function($scope, $window, article, Publisher, Authentication, Notify, ngDialog, $analytics) {

		$scope.article = article;
		$scope.user = Authentication.user;

		// Get timezone based abbreviation to pass to date filter
		// get from user's TZ preference, which is saved as unique Moment timezone identifier.
		// EX: 'America/New_York' becomes "EST" or "EDT", depending on the timestamp.
		$scope.tz = moment.tz.zone(user.tz).abbr(
			moment($scope.article.tstamp).unix()
		);

		const predicate = function(id){
			return function(object){
				return object._id === id;
			};
		};

		$scope.copySuccess = function(e){
			Notify.alert('This URL has been copied to your clipboard.',{});
		};

        $scope.publisher = $scope.article.publisher;
        $scope.site = _.find($scope.publisher.sites, predicate($scope.article.site));
	}
]);