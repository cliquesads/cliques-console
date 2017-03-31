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
    'CRONTAB_DAY_OPTIONS',
    function(
        $rootScope,
        aggregationDateRanges,
        DatepickerService,
        Analytics,
        Notify,
        ngDialog,
        CRONTAB_DAY_OPTIONS
    ) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                availableSettings: '=',
            },
            templateUrl: 'modules/analytics/views/partials/report-settings.html',
            link: function(scope, element, attrs) {
                // Default values for selectedSettings
                scope.selectedSettings = {
                    dateRange: '7d',
                    timeUnit: 'day'
                };
                scope.crontabDayOptions = CRONTAB_DAY_OPTIONS;

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
                			controller: ['$scope', function($scope) {
                				$scope.selectedSettings = scope.selectedSettings;
                				$scope.crontabDayOptions = scope.crontabDayOptions;
                			}]
                		});
                	}
                };

                scope.launchQuery = function(event) {
                    event.preventDefault();
                    // TO-DO:::ycx
                    // Should set up query params here and launch query
                };
            }
        };
    }
]);
