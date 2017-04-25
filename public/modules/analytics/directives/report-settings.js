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
                allCountries: '=',
                selectedSettings: '=',
                availableSettings: '='
            },
            templateUrl: 'modules/analytics/views/partials/report-settings.html',
            link: function(scope, element, attrs) {
                scope.calendar = DatepickerService;
                scope.dateRanges = aggregationDateRanges(user.tz);

                scope.countrySelected = function() {
                    if (scope.selectedSettings.country) {
                        $rootScope.$broadcast('countrySelected', {country: scope.selectedSettings.country});
                    }
                };

                scope.showSaveQueryDialog = function() {
                    var parentScope = scope;
                    ngDialog.open({
                        template: 'modules/analytics/views/partials/save-query-dialog.html',
                        controller: ['$scope', 'CRONTAB_DAY_OPTIONS', 'Notify', function($scope, CRONTAB_DAY_OPTIONS, Notify) {
                            $scope.selectedSettings = parentScope.selectedSettings;
                            $scope.crontabDayOptions = CRONTAB_DAY_OPTIONS;
                            $scope.isScheduled = false;
                            $scope.crontabAmPm = 'AM';

                            $scope.saveQuery = function() {
                                if ($scope.crontabHour === 12){
                                    if ($scope.crontabAmPm === 'AM'){
                                        $scope.crontabHour = 0;
                                    }
                                } else {
                                    if ($scope.crontabAmPm === 'PM'){
                                        $scope.crontabHour += 12;
                                    }
                                }
                                if ($scope.isScheduled){
                                    $scope.selectedSettings.schedule = $scope.crontabMinute + ' ' + $scope.crontabHour + $scope.crontabDay;
                                }
                                // Post query param to backend
                                scope.selectedSettings.isSaved = true;
                                Analytics.saveQuery($scope.selectedSettings)
                                .then(function(response) {
                                    // Notify that this query has been saved and inform other directives the saved query id
                                    $rootScope.$broadcast('querySaved', {savedQueryId: response.data});
                                    Notify.alert("Query saved successfully! You can now view this query under My Queries.", {
                                        status: 'success'
                                    });
                                    $scope.closeThisDialog(0);
                                }, function(error) {
                                    Notify.alert(error.message, {
                                        status: 'danger'
                                    });
                                    $scope.closeThisDialog(1);
                                });
                            };
                        }]
                    });
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
