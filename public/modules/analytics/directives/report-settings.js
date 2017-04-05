/**
 * Created by Chuoxian Yang on 31/3/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('reportSettings', [
    '$rootScope',
    'aggregationDateRanges',
    'DatepickerService',
    'Analytics',
    'Notify',
    'ngDialog',
    function(
        $rootScope,
        aggregationDateRanges,
        DatepickerService,
        Analytics,
        Notify,
        ngDialog
    ) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                selectedSettings: '=',
                availableSettings: '='
            },
            templateUrl: 'modules/analytics/views/partials/report-settings.html',
            link: function(scope, element, attrs) {
                scope.calendar = DatepickerService;
                scope.dateRanges = aggregationDateRanges(user.tz);

                if (scope.availableSettings.campaignFilter) {
                    // report settings has campaign fileter, should get all campaigns for current user
                    Analytics.getAllCampaigns()
                        .success(function(data) {
                            scope.allCampaigns = data;
                        })
                        .error(function(error) {
                            Notify.alert(error.message, {
                                status: 'danger'
                            });
                        });
                }
                if (scope.availableSettings.siteFilter) {
                    // report settings has site filter, should get all sites for current user	
                    Analytics.getAllSites()
                        .success(function(data) {
                            scope.allSites = data;
                        })
                        .error(function(error) {
                            Notify.alert(error.message, {
                                status: 'danger'
                            });
                        });
                }

                scope.showSaveQueryDialog = function() {
                	if (scope.selectedSettings.isSaved) {
                		ngDialog.open({
                			template: 'modules/analytics/views/partials/save-query-dialog.html',
                			controller: ['$scope', 'CRONTAB_DAY_OPTIONS', function($scope, CRONTAB_DAY_OPTIONS) {
                				$scope.selectedSettings = scope.selectedSettings;
                				$scope.crontabDayOptions = CRONTAB_DAY_OPTIONS;
                				// Validate input so as to decide whether to disable save button or not
                				$scope.inputValid = function() {
									if ($scope.selectedSettings.name && $scope.selectedSettings.name.length > 0) {
										if ($scope.crontabDay &&
                                            ($scope.crontabHour || $scope.crontabHour === 0) &&
                                            ($scope.crontabMinute || $scope.crontabMinute === 0)) {
											return true;
										}
									} 
									return false;
                				};
                				$scope.saveQuery = function() {
									$scope.selectedSettings.schedule = $scope.crontabMinute + ' ' + $scope.crontabHour + $scope.crontabDay;
									$scope.closeThisDialog(0);
                				};
                			}]
                		});
                	}
                };

                scope.launchQuery = function(event) {
                    event.preventDefault();
                    // set up start date and end date if not designated as custom dates by user already, also setup date range title for displaying and humanizedDateRange so as to save in database in case needed
                    if (scope.selectedSettings.dateRangeShortCode !== 'custom') {
						scope.selectedSettings.startDate = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].startDate;
						scope.selectedSettings.endDate = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].endDate;
                        // humanizedDateRange setup for displaying
                        scope.humanizedDateRange = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].label;
                    } else {
                        // humanizedDateRange setup for displaying
                        scope.humanizedDateRange = scope.selectedSettings.startDate + ' - ' + scope.selectedSettings.endDate;
                    }
                    scope.selectedSettings.humanizedDateRange = scope.humanizedDateRange;
					// Send broadcast message to notify query graph/table directive to launch query
					$rootScope.$broadcast('launchQuery', {
						queryParam: scope.selectedSettings,
                        humanizedDateRange: scope.humanizedDateRange
					});
                };
            }
        };
    }
]);
