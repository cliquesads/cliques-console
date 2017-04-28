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

                scope.campaignFilterSelected = function() {
                    var i;
                    if (scope.selectedSettings.campaign) {
                        // add or update campaign filter string in filters array
                        var campaignFilterString = 'campaign' + scope.selectedSettings.campaign;
                        if (!scope.selectedSettings.filters) {
                            scope.selectedSettings.filters = [campaignFilterString];
                        } else {
                            for (i = 0; i < scope.selectedSettings.filters.length; i ++) {
                                if (scope.selectedSettings.filters[i].startsWith('campaign')) {
                                    scope.selectedSettings.filters[i] = campaignFilterString;
                                    break;
                                }
                            }
                            if (scope.selectedSettings.filters.indexOf(campaignFilterString) === -1) {
                                scope.selectedSettings.filters.push(campaignFilterString);
                            }
                        }
                    } else {
                        // remove campaign filter string in filters array
                        var campaignFilterIndex;
                        for (i = 0; i < scope.selectedSettings.filters.length; i ++) {
                            if (scope.selectedSettings.filters[i].startsWith('campaign')) {
                                campaignFilterIndex = i;
                                break;
                            }
                        }
                        if (campaignFilterIndex) {
                            scope.selectedSettings.filters.splice(campaignFilterIndex, 1);
                        }
                    }
                };

                scope.siteFilterSelected = function() {
                    var i;
                    if (scope.selectedSettings.site) {
                        // add or update site filter string in filters array
                        var siteFilterString = 'site' + scope.selectedSettings.site;
                        if (!scope.selectedSettings.filters) {
                            scope.selectedSettings.filters = [siteFilterString]; 
                        } else {
                            for (i = 0; i < scope.selectedSettings.filters.length; i ++) {
                                if (scope.selectedSettings.filters[i].startsWith('site')) {
                                    scope.selectedSettings.filters[i] = siteFilterString;
                                    break;
                                }
                            }
                            if (scope.selectedSettings.filters.indexOf(siteFilterString) === -1) {
                                scope.selectedSettings.filters.push(siteFilterString);
                            }
                        }
                    } else {
                        // remove site filter string in filters array
                        var siteFilterIndex;
                        for (i = 0; i < scope.selectedSettings.filters.length; i ++) {
                            if (scope.selectedSettings.filters[i].startsWith('site')) {
                                siteFilterIndex = i;
                                break;
                            }
                        }
                        if (siteFilterIndex) {
                            scope.selectedSettings.filters.splice(siteFilterIndex, 1);
                        }
                    }
                };

                scope.countrySelected = function() {
                    if (scope.selectedSettings.country) {
                        // Country selected, get its regions
                        Analytics.getRegions(scope.selectedSettings.country)
                            .success(function(data) {
                                scope.regions = data;
                            })
                            .error(function(error) {
                                Notify.alert(error.message, {
                                    status: 'danger'
                                });
                            });
                    }
                };

                if (scope.availableSettings.countryFilter) {
                    // has country filter, should get all countries for current user
                    Analytics.getAllCountries()
                    .success(function(data) {
                        scope.allCountries = data;
                        scope.allCountries.forEach(function(country) {
                            if (country._id === user.organization.country || 
                                country.name === user.organization.country) {
                                // setup default selected country based on user country
                                scope.selectedSettings.country = country;
                            }
                        });
                    })
                    .error(function(error) {
                        Notify.alert(error.message, {
                            status: 'danger'
                        });
                    });
                }

                // Fetch regions for country in which user locates,
                // and then setup default selected region on user region
                if (scope.availableSettings.regionFilter) {
                    Analytics.getRegions(user.organization.country)
                    .success(function(data) {
                        scope.regions = data;
                        for (var i = 0; i < scope.regions.length; i ++) {
                            if (user.organization.state === scope.regions[i].name) {
                                scope.selectedSettings.region = scope.regions[i];
                            }
                        }
                    })
                    .error(function(error) {
                        Notify.alert(error.message, {
                            status: 'danger'
                        });
                    });
                }

                scope.showSaveQueryDialog = function() {
                    var parentScope = scope;
                    ngDialog.open({
                        template: 'modules/analytics/views/partials/save-query-dialog.html',
                        controller: ['$scope', 'CRONTAB_DAY_OPTIONS', 'Notify', 'Query',function($scope, CRONTAB_DAY_OPTIONS, Notify, Query) {
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

                                // update this query by setting `isSaved` to true and also `schedule` field if any
                                new Query($scope.selectedSettings).$update(function(response) {
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
