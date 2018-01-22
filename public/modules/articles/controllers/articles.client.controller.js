/* global _, angular, user */
'use strict';

angular.module('article').controller('ListArticlesController', ['$scope', 'Article', 'Publisher', 'Notify', 'ngDialog', '$http', '$window', '$state',
	function($scope, Article, Publisher, Notify, ngDialog, $http, $window, $state) {
		$scope.hasMore = true;

		let initialQueryParams = {
			page: 1,
			per_page: 25,
		};

		$scope.queryParams = _.clone(initialQueryParams);

		$scope.articles = [];

		$scope.getPaginatedArticles = function() {
			if (!$scope.hasMore) {
				return;
			}
			// TODO: $http's returned promise's $resolved property doesn't
			// TODO: exactly behave as expected here so have to manually set resolved flags,
			// TODO: which is really annoying
			$scope.resolved = false;
			$scope.articleRequest = Article.query($scope.queryParams).$promise
			.then(function(response) {
				$scope.resolved = true;
			    $scope.articles = $scope.articles.concat(response.models);
			    if (response.length < response.itemsPerPage) {
			    	$scope.hasMore = false;
			    }
			}, function(errorResponse) {
				$scope.resolved = true;
			    Notify.alert(errorResponse.message, {status: 'danger'});
			});
		};

		$scope.getPaginatedArticles();

		$scope.reachedBottom = function() {
			if ($state.current.name === 'app.article.listArticles' && $scope.hasMore) {
				$scope.queryParams.page ++;
				$scope.getPaginatedArticles();
			}
		};
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
			moment($scope.screenshot.tstamp).unix()
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