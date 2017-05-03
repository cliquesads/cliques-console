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
    function(
        $rootScope,
        aggregationDateRanges,
        DatepickerService,
        Analytics,
        Advertiser,
        Publisher,
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

                // Decide initial start date and end date for query params
                if (scope.selectedSettings.dateRangeShortCode !== 'custom') {
                    scope.selectedSettings.startDate = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].startDate;
                    scope.selectedSettings.endDate = scope.dateRanges[scope.selectedSettings.dateRangeShortCode].endDate;
                } else {
                    var dateArr = scope.selectedSettings.humanizedDateRange.split(' - ');
                    scope.selectedSettings.startDate = dateArr[0];
                    scope.selectedSettings.endDate = dateArr[1];
                }

                // Decide filters array in query param
                if (!scope.selectedSettings.filters) {
                    scope.selectedSettings.filters = [];
                }
                // setup initial site/campaign/country/region value in query param based on filters array
                scope.selectedSettings.filters.forEach(function(filterString) {
                    if (filterString.startsWith('site')) {
                        scope.selectedSettings.site = filterString.replace('site', ''); 
                    } else if (filterString.startsWith('campaign')) {
                        scope.selectedSettings.campaign = filterString.replace('campaign', ''); 
                    } else if (filterString.startsWith('country')) {
                        scope.selectedSettings.country = filterString.replace('country', ''); 
                    } else if (filterString.startsWith('region')) {
                        scope.selectedSettings.region = filterString.replace('region', ''); 
                    }
                });

                scope.launchQuery = function() {
                    // Send broadcast message to notify query graph/table directive to launch query
                    $rootScope.$broadcast('launchQuery', {queryParam: scope.selectedSettings});
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
                                scope.updateFiltersArray('country', scope.selectedSettings.country); 
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
                                scope.updateFiltersArray('region', scope.selectedSettings.region);
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

                scope.updateFiltersArray = function(filterType, filterId) {
                    var i;
                    if (scope.selectedSettings[filterType]) {
                        // add or update filter string in filters array
                        var filterString = filterType + filterId;
                        var updated = false;
                        for (i = 0; i < scope.selectedSettings.filters.length; i ++) {
                            if (scope.selectedSettings.filters[i].startsWith(filterType)) {
                                scope.selectedSettings.filters[i] = filterString;
                                updated = true;
                                break;
                            }
                        }
                        if (!updated) {
                            scope.selectedSettings.filters.push(filterString);
                        }
                    } else {
                        // remove filter string in filters array
                        var filterIndex;
                        for (i = 0; i < scope.selectedSettings.filters.length; i ++) {
                            if (scope.selectedSettings.filters[i].startsWith(filterType)) {
                                filterIndex = i;
                                break;
                            }
                        }
                        if (filterIndex >= 0) {
                            scope.selectedSettings.filters.splice(filterIndex, 1);
                        }
                    }
                };

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
                                scope.selectedSettings.region = undefined;
                                scope.updateFiltersArray('region', undefined);
                            })
                            .error(function(error) {
                                Notify.alert(error.message, {
                                    status: 'danger'
                                });
                            });
                    } else {
                        scope.selectedSettings.country = undefined;
                        scope.regions = undefined;
                        scope.geo.regionObject = undefined;
                        scope.selectedSettings.region = undefined;
                        scope.updateFiltersArray('region', undefined);
                    }
                    // update country filter in filters array
                    scope.updateFiltersArray('country', scope.selectedSettings.country);
                };

                scope.regionSelected = function() {
                    if (scope.geo.regionObject) {
                        scope.selectedSettings.region = scope.geo.regionObject._id;
                    } else {
                        scope.selectedSettings.region = undefined;
                    }
                    // update region filter in filters array
                    scope.updateFiltersArray('region', scope.selectedSettings.region);
                };

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
                                if ($scope.isScheduled) {
                                    var nowInUserTimzone = moment.tz(user.tz);
                                    var timezoneOffsetInMinute = moment.tz.zone(user.tz).offset(nowInUserTimzone);

                                    var scheduledTime = moment.tz(user.tz);
                                    scheduledTime.minute($scope.crontabMinute);
                                    scheduledTime.hour($scope.crontabHour);

                                    var tempDate = scheduledTime.day();

                                    scheduledTime.add(timezoneOffsetInMinute, 'minutes');

                                    var dayOffset = scheduledTime.day() - tempDate;
                                    if (dayOffset !== 0) {
                                        switch ($scope.crontabDay) {
                                            case CRONTAB_DAY_OPTIONS['Every week day']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 2-6' : ' * * 0-4');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['The 1st of each month']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' 2 * *' : ' 28 * *');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['The last day of each month']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' 1 * *' : ' 27 * *');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['Every Monday']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 2' : ' * * 7');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['Every Tuesday']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 3' : ' * * 1');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['Every Wednesday']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 4' : ' * * 2');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['Every Thursday']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 5' : ' * * 3');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['Every Friday']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 6' : ' * * 4');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['Every Saturday']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 7' : ' * * 5');
                                                break;
                                            case CRONTAB_DAY_OPTIONS['Every Sunday']:
                                                $scope.crontabDay = (dayOffset === 1 ? ' * * 1' : ' * * 6');
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                    $scope.crontabHour = scheduledTime.hour();
                                    $scope.crontabMinute = scheduledTime.minute();

                                    $scope.selectedSettings.schedule = $scope.crontabMinute + ' ' + $scope.crontabHour + $scope.crontabDay;
                                }

                                // update this query by setting `isSaved` to true and also `schedule` field if any
                                // Post query param to backend
                                $scope.selectedSettings.isSaved = true;
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
            }
        };
    }
]);
