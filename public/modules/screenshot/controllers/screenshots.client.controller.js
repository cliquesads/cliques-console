/* global _, angular, user */
'use strict';

angular.module('screenshot').controller('ListScreenshotsController', ['$scope', 'Advertiser', 'Screenshot', 'Notify', 'ngDialog', '$http', '$window', '$state',
	function($scope, Advertiser, Screenshot, Notify, ngDialog, $http, $window, $state) {
		$scope.hasMore = true;

		var initialQueryParams = {
			page: 1,
			filterCampaignId: null,
			filterSiteId: null
		};

		$scope.queryParams = _.clone(initialQueryParams);

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
			// TODO: $http's returned promise's $resolved property doesn't
			// TODO: exactly behave as expected here so have to manually set resolved flags,
			// TODO: which is really annoying
			$scope.resolved = false;
			$scope.screenshotRequest = Screenshot.query($scope.queryParams).$promise
			.then(function(response) {
				$scope.resolved = true;
			    $scope.screenshots = $scope.screenshots.concat(response.models);
			    if (response.length < response.itemsPerPage) {
			    	$scope.hasMore = false;
			    }
			}, function(errorResponse) {
				$scope.resolved = true;
			    Notify.alert(errorResponse.message, {status: 'danger'});
			});
		};

		$http.get('/console/screenshot/getFilters')
		.success(function(data) {
			$scope.filter = data;
		});

		$scope.getPaginatedScreenshots();

		$scope.filterChanged = function() {
			// reset currentPage and screenshots, then fetch screenshots
			$scope.hasMore = true;
			$scope.queryParams.page = 1;
			$scope.screenshots = [];
			$scope.getPaginatedScreenshots();
		};

		$scope.clearFilters = function() {
			if ($scope.queryParams.filterCampaignId || $scope.queryParams.filterSiteId) {
				// reset currentPage, filters and screenshots, then fetch screenshots
				$scope.hasMore = true;
				$scope.screenshots = [];
				$scope.queryParams = _.clone(initialQueryParams);
				$scope.getPaginatedScreenshots();
			}
		};

		$scope.reachedBottom = function() {
			if ($state.current.name === 'app.screenshot.listScreenshots' && $scope.hasMore) {
				$scope.queryParams.page ++;
				$scope.getPaginatedScreenshots();
			}
		};
	}
]).controller('ScreenshotController', ['$scope', '$window', 'screenshot', 'Advertiser', 'Publisher','Authentication',
    'Notify','ngDialog','$analytics',
	function($scope, $window, screenshot, Advertiser, Publisher, Authentication, Notify, ngDialog, $analytics) {

		$scope.screenshot = screenshot;
		$scope.user = Authentication.user;

		// Get timezone based abbreviation to pass to date filter
		// get from user's TZ preference, which is saved as unique Moment timezone identifier.
		// EX: 'America/New_York' becomes "EST" or "EDT", depending on the timestamp.
		$scope.tz = moment.tz.zone(user.tz).abbr(
			moment($scope.screenshot.tstamp).unix()
		);

		var predicate = function(id){
			return function(object){
				return object._id === id;
			};
		};

		$scope.copySuccess = function(e){
			Notify.alert('This URL has been copied to your clipboard.',{});
		};

        $scope.advertiser = $scope.screenshot.advertiser;
        $scope.campaign = _.find($scope.advertiser.campaigns, predicate($scope.screenshot.campaign));
        $scope.creativegroup = _.find($scope.campaign.creativegroups, predicate($scope.screenshot.creativegroup));

        $scope.publisher = $scope.screenshot.publisher;
        $scope.site = _.find($scope.publisher.sites, predicate($scope.screenshot.site));
        $scope.page = _.find($scope.site.pages, predicate($scope.screenshot.page));
        $scope.placement = _.find($scope.page.placements, predicate($scope.screenshot.placement));

		$scope.reportScreenshotDialog = function(screenshot){
            ngDialog.open({
                className: 'ngdialog-theme-default',
                template: 'modules/screenshot/views/partials/report-screenshot-dialog.html',
                controller: ['$scope', '$http', '$analytics', function ($scope, $http, $analytics) {
                    $scope.screenshot = $scope.ngDialogData.screenshot;
                    $scope.submit = function(){
                        $scope.loading = true;
                        if ($scope.reportScreenshotForm.$valid){
                            $http.post('/console/screenshot/' + $scope.screenshot._id + '/report', {"comment": $scope.comment})
                                .success(function(response){
                                    Notify.alert('Screenshot has been reported, someone from our team will get back to you shortly.', {status: 'success'});
                                    $scope.loading = false;
                                    $scope.closeThisDialog('success');
                                    $analytics.eventTrack('screenshotReported', { comment: $scope.reportScreenshotForm.comment });
                                })
                                .error(function(response){
                                    $scope.loading = false;
                                    Notify.alert(response.message, {status: 'danger'});
                                });
                        } else {
                            $scope.loading = false;
                        }
                    };
                }],
                data: {screenshot: screenshot}
            });
		};
	}
]);