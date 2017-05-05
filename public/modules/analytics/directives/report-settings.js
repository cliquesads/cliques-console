/**
 * Created by Chuoxian Yang on 31/3/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('reportSettings', [
    '$rootScope',
    'aggregationDateRanges',
    'DatepickerService',
    'Analytics',
    'Advertiser',
    'Publisher',
    'Notify',
    'ngDialog',
    'Query',
    function(
        $rootScope,
        aggregationDateRanges,
        DatepickerService,
        Analytics,
        Advertiser,
        Publisher,
        Notify,
        ngDialog,
        Query
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

                scope.queryParamSaved = scope.selectedSettings.isSaved;

                // Watching for selectedSettings changes
                scope._selectedSettingsInit = angular.copy(scope.selectedSettings);
                scope.$watch('selectedSettings', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        if (!angular.equals(newVal, scope._selectedSettingsInit)) {
                            scope.queryParamSaved = false;
                            scope.dirty = true;
                        }
                    }
                }, true);

                scope.launchQuery = function() {
                    $rootScope.$broadcast('queryStarted');

                    var queryResults;
                    Analytics.queryFunction(scope.selectedSettings.type, $rootScope.role)(scope.selectedSettings)
                    .then(function(response) {
                        queryResults = response.data;
                        if (!scope.selectedSettings._id) {
                            // This query has NOT been saved yet, save it to backend database
                            return new Query(scope.selectedSettings).$create();
                        } else {
                            // This query is already saved, update it in backend database
                            return new Query(scope.selectedSettings).$update();
                        }
                    })
                    .then(function(response) {
                        scope.selectedSettings._id = response.id;
                        scope.selectedSettings.dateRange = response.dateRange;

                        $rootScope.$broadcast('queryEnded', {
                            queryParam: scope.selectedSettings,
                            results: queryResults
                        });
                    })
                    .catch(function(error) {
                        Notify.alert('Error on query'); 
                        $rootScope.$broadcast('queryError');
                    });
                };

                scope.shouldLaunchQuery = function(numberOfFiltersToFetch) {
                    if (numberOfFiltersToFetch === 0) {
                        // No filter to fetch from backend, launch query immediately
                        scope.launchQuery();
                    }
                };

                // Counter to record number of kinds of filters that should be fetched from backend, initial query should be launched only AFTER all filters data are fetched from backend
                var numberOfFiltersToFetch = 0;
                if (scope.availableSettings.campaignFilter) {
                    numberOfFiltersToFetch ++; 
                }
                if (scope.availableSettings.siteFilter) {
                    numberOfFiltersToFetch ++;
                }
                if (scope.availableSettings.countryFilter) {
                    numberOfFiltersToFetch ++;
                }
                if (scope.availableSettings.regionFilter) {
                    numberOfFiltersToFetch ++;
                }
                scope.shouldLaunchQuery(numberOfFiltersToFetch);

                if (scope.availableSettings.campaignFilter) {
                    // has campaign filter, should get all campaigns for current user
                    var allCampaigns = [];
                    Advertiser.query(function(advertisers) {
                        advertisers.forEach(function(advertiser) {
                            allCampaigns = allCampaigns.concat(advertiser.campaigns);
                        });
                        scope.allCampaigns = allCampaigns;
                        numberOfFiltersToFetch --;
                        // check if no more filters to fetch, if so launch initial query
                        scope.shouldLaunchQuery(numberOfFiltersToFetch);
                    });
                }

                if (scope.availableSettings.siteFilter) {
                    // has site filter, should get all sites for current user   
                    var allSites = [];
                    Publisher.query(function(publishers) {
                        publishers.forEach(function(publisher) {
                            allSites = allSites.concat(publisher.sites);
                        });
                        scope.allSites = allSites;
                        numberOfFiltersToFetch --;
                        // check if no more filters to fetch, if so launch initial query
                        scope.shouldLaunchQuery(numberOfFiltersToFetch);
                    });
                }

                if (scope.availableSettings.countryFilter) {
                    // has country filter, should get all countries for current user
                    Analytics.getAllCountries()
                    .success(function(data) {
                        scope.allCountries = data;
                        // setup default selected country based on user country
                        for (var i = 0; i < scope.allCountries.length; i ++) {
                            if (scope.allCountries[i]._id === user.organization.country ||
                                scope.allCountries[i].name === user.organization.country) {
                                scope.geo.countryObject = scope.allCountries[i];
                                scope.selectedSettings.country = scope.geo.countryObject._id;
                                break;
                            }
                        }
                        numberOfFiltersToFetch --;
                        // check if no more filters to fetch, if so launch initial query
                        scope.shouldLaunchQuery(numberOfFiltersToFetch);
                    })
                    .error(function(error) {
                        Notify.alert(error.message, {
                            status: 'danger'
                        });
                    });
                }

                if (scope.availableSettings.regionFilter) {
                    // has region filter, should get all regions for the user's country
                    Analytics.getRegions(user.organization.country)
                    .success(function(data) {
                        scope.regions = data;
                        // setup default selected region based on user's region
                        for (var i = 0; i < scope.regions.length; i ++) {
                            if (user.organization.state === scope.regions[i].name) {
                                scope.geo.regionObject = scope.regions[i];
                                scope.selectedSettings.region = scope.geo.regionObject._id;
                                break;
                            }
                        }
                        numberOfFiltersToFetch --;
                        // check if no more filters to fetch, if so launch initial query
                        scope.shouldLaunchQuery(numberOfFiltersToFetch);
                    })
                    .error(function(error) {
                        Notify.alert(error.message, {
                            status: 'danger'
                        });
                    });
                }

                scope.geo = {};
                scope.countrySelected = function() {
                    if (scope.geo.countryObject) {
                        scope.selectedSettings.country = scope.geo.countryObject._id;
                        // Country selected, get its regions
                        Analytics.getRegions(scope.selectedSettings.country)
                            .success(function(data) {
                                // reset region
                                scope.regions = data;
                                scope.geo.regionObject = undefined;
                                scope.selectedSettings.region = '';
                            })
                            .error(function(error) {
                                Notify.alert(error.message, {
                                    status: 'danger'
                                });
                            });
                    } else {
                        scope.regions = undefined;
                        scope.geo.regionObject = undefined;
                        scope.selectedSettings.country = '';
                        scope.selectedSettings.region = '';
                    }
                };

                scope.regionSelected = function() {
                    if (scope.geo.regionObject) {
                        scope.selectedSettings.region = scope.geo.regionObject._id;
                    } else {
                        scope.selectedSettings.region = '';
                    }
                };

                scope.showSaveOrScheduleQueryDialog = function(state) {
                    var parentScope = scope;

                    // Decide the purpose of this dialog so as to decide which template to load, purpose could be
                    // a. save query
                    // b. schedule query or
                    // c. save & schedule query
                    var template = 'modules/analytics/views/partials/edit-schedule.html';
                    if (!state) {
                        if (!parentScope.selectedSettings.schedule) {
                            template = 'modules/analytics/views/partials/save-schedule-query.html';
                        } else {
                            template = 'modules/analytics/views/partials/save-query.html';
                        }
                    }
                    ngDialog.open({
                        template: template,
                        controller: ['$scope', 'CRONTAB_DAY_OPTIONS', 'Notify', 'Query',function($scope, CRONTAB_DAY_OPTIONS, Notify, Query) {

                            $scope.selectedSettings = parentScope.selectedSettings;
                            $scope.crontabDayOptions = CRONTAB_DAY_OPTIONS;
                            $scope.isScheduled = false;
                            $scope.crontabAmPm = 'AM';

                            if (state === 'schedule') {
                                // currently editing existing schedule
                                var crontabInfo = Analytics.translateCrontabString($scope.selectedSettings.schedule);
                                $scope.crontabDay = crontabInfo.crontabDay;

                                $scope.crontabHour = crontabInfo.crontabHour;
                                $scope.crontabMinute = crontabInfo.crontabMinute;
                                $scope.crontabAmPm = crontabInfo.crontabAmPm;
                            }
                            
                            $scope.editSchedule = function() {
                                $scope.selectedSettings.schedule = Analytics.adjustCrontabStringForTimezone($scope.crontabDay, $scope.crontabHour, $scope.crontabMinute, $scope.crontabAmPm);
                                $scope.closeThisDialog(0);
                            };

                            $scope.saveQuery = function() {
                                // update this query by setting `isSaved` to true and also `schedule` field if any by posting query param to backend
                                $scope.selectedSettings.isSaved = true;
                                new Query($scope.selectedSettings).$update(function(response) {
                                    Notify.alert("Query saved successfully! You can now view this query under My Queries.", {
                                        status: 'success'
                                    });
                                    $scope.closeThisDialog(0);
                                    // update client side query save flag
                                    parentScope.queryParamSaved = true;
                                }, function(error) {
                                    Notify.alert(error.message, {
                                        status: 'danger'
                                    });
                                    $scope.closeThisDialog(1);
                                });
                            };

                            $scope.saveAndScheduleQuery = function() {
                                if ($scope.isScheduled) {
                                    $scope.editSchedule();
                                }
                                $scope.saveQuery();
                            };
                        }]
                    });
                };

                scope.timePeriodChanged = function() {
                    if (scope.selectedSettings.dateRangeShortCode) {
                        // set up start date and end date if not designated as custom dates by user already, also setup date range title for displaying and humanizedDateRange so as to save in database in case needed
                        if (scope.selectedSettings.dateRangeShortCode !== 'custom') {
                            // humanizedDateRange setup for selected date short code
                            scope.selectedSettings.humanizedDateRange = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].label;
                        }
                    }
                };

                scope.getCustomHumanizedDateRange = function() {
                    var momentStartDate = moment.tz(scope.selectedSettings.startDate, user.tz).format();
                    var momentEndDate = moment.tz(scope.selectedSettings.endDate, user.tz).format();
                    if (scope.selectedSettings.startDate && scope.selectedSettings.endDate) {
                        scope.selectedSettings.humanizedDateRange = momentStartDate + ' - ' + momentEndDate;
                    }
                };
            }
        };
    }
]);
