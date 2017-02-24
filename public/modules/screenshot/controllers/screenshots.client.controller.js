/* global _, angular, user */
'use strict';

angular.module('screenshot').controller('ScreenshotController', ['$scope', 'Advertiser', 'ScreenshotFetcher', 'Notify', 'ngDialog', '$http', '$window',
	function($scope, Advertiser, ScreenshotFetcher, Notify, ngDialog, $http, $window) {
		$scope.hasMore = true;
		$scope.currentPage = 1;
		$scope.filterCampaign = undefined;
		$scope.filterSite = undefined;

		// Handler for 'panel-remove' event, when user clicks the "close panel"
		// button. You can add custom events here to trigger on removal, right now it just
		// resolves the promise and nothing else. You HAVE to resolve the promise in
		// order for the panel to remove.
		$scope.$on('panel-remove', function(event, id, deferred){
			deferred.resolve();
		});

		$scope.screenshots = [];

		$scope.getPaginatedScreenshots = function() {
			if (!$scope.hasMore) {
				return;
			}
			var queryParams = {
				page: $scope.currentPage
			};
			if ($scope.filterCampaign) {
				queryParams.filterCampaignId = $scope.filterCampaign.id;
			} 
			if ($scope.filterSite) {
				queryParams.filterSiteId = $scope.filterSite.id;
			}
			// TODO: $http's returned promise's $resolved property doesn't
			// TODO: exactly behave as expected here so have to manually set resolved flags,
			// TODO: which is really annoying
			$scope.resolved = false;
			$scope.screenshotRequest = ScreenshotFetcher.fetch(queryParams)
			.then(function(response) {
				$scope.resolved = true;
			    $scope.screenshots = $scope.screenshots.concat(response.data.models);
			    if (response.data.length < response.data.itemsPerPage) {
			    	$scope.hasMore = false;
			    }
			}, function(errorResponse) {
				$scope.resolved = true;
			    Notify.alert(errorResponse.data.message, {status: 'danger'});
			});
		};

		$http.get('/console/screenshot/getFilters')
		.success(function(data) {
			$scope.filter = data;
		});

		$scope.getPaginatedScreenshots();

		$scope.viewScreenshot = function(screenshot){
		    ngDialog.open({
		        template: 'modules/core/views/partials/screenshot-dialog.html',
		        data: { screenshotUrl: screenshot.image_url },
		        className: 'ngdialog-theme-default dialogwidth800'
		    });
		};

		$scope.filterChanged = function() {
			// reset currentPage and screenshots, then fetch screenshots
			$scope.hasMore = true;
			$scope.currentPage = 1;
			$scope.screenshots = [];
			$scope.getPaginatedScreenshots();
		};

		$scope.clearFilters = function() {
			if ($scope.filterCampaign || $scope.filterSite) {
				// reset currentPage, filters and screenshots, then fetch screenshots
				$scope.hasMore = true;
				$scope.currentPage = 1;
				$scope.screenshots = [];
				$scope.filterCampaign = undefined;
				$scope.filterSite = undefined;
				$scope.getPaginatedScreenshots();
			}
		};

		angular.element($window).bind("scroll", function() {
			var windowHeight = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
			var body = document.body, html = document.documentElement;
			var docHeight = Math.max(body.scrollHeight,
			body.offsetHeight, html.clientHeight,html.scrollHeight, html.offsetHeight);
			var windowBottom = windowHeight + window.pageYOffset;
			if (windowBottom >= docHeight) {
				// reached bottom, fetching next page if there're more screenshots
				if ($scope.hasMore) {
					$scope.currentPage ++;
					$scope.getPaginatedScreenshots();
				}
			}
		});
	}
]);