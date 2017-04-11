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
                allCampaigns: '=',
                allSites: '=',
                selectedSettings: '=',
                availableSettings: '='
            },
            templateUrl: 'modules/analytics/views/partials/report-settings.html',
            link: function(scope, element, attrs) {
                scope.calendar = DatepickerService;
                scope.dateRanges = aggregationDateRanges(user.tz);

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
                                    // Post query param to backend
                                    Analytics.saveQuery($scope.selectedSettings)
                                    .then(function(response) {
                                        // Notify that this query has been saved and inform other directives the saved query id
                                        $rootScope.$broadcast('querySaved', {savedQueryId: response.data});
                                    })
                                    .catch(function(error) {
                                        Notify.alert(error.message, {
                                            status: 'danger'
                                        });
                                    });
									$scope.closeThisDialog(0);
                				};
                			}]
                		});
                	}
                };

                scope.timePeriodChanged = function() {
                    if (scope.selectedSettings.dateRangeShortCode) {
                        // set up start date and end date if not designated as custom dates by user already, also setup date range title for displaying and humanizedDateRange so as to save in database in case needed
                        if (scope.selectedSettings.dateRangeShortCode !== 'custom') {
                            scope.selectedSettings.startDate = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].startDate;
                            scope.selectedSettings.endDate = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].endDate;
                            // humanizedDateRange setup for selected date short code
                            scope.humanizedDateRange = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].label;
                        } else {
                            // humanizedDateRange setup for custom selected start/end date
                            var momentStartDate = moment(scope.selectedSettings.startDate);
                            var momentEndDate = moment(scope.selectedSettings.endDate);

                            scope.humanizedDateRange = momentStartDate.format('YYYY-MM-DD') + ' - ' + momentEndDate.format('YYYY-MM-DD');
                        }
                        scope.selectedSettings.humanizedDateRange = scope.humanizedDateRange;
                    }
                };

                scope.launchQuery = function(event) {
                    event.preventDefault();
					// Send broadcast message to notify query graph/table directive to launch query
					$rootScope.$broadcast('launchQuery', {queryParam: scope.selectedSettings});
                };
            }
        };
    }
]);
