/**
 * Created by Chuoxian Yang on 31/3/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('reportSettings', [
    '$rootScope',
    '$q',
    '$stateParams',
    'aggregationDateRanges',
    'DatepickerService',
    'Analytics',
    'Advertiser',
    'Publisher',
    'Notify',
    'ngDialog',
    'Query',
    'Region',
    'Country',
    function(
        $rootScope,
        $q,
        $stateParams,
        aggregationDateRanges,
        DatepickerService,
        Analytics,
        Advertiser,
        Publisher,
        Notify,
        ngDialog,
        Query,
        Region,
        Country
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
                scope.filters = {};
                scope.calendar = DatepickerService;
                scope.dateRanges = aggregationDateRanges(user.tz);
                scope.queryParamSaved = scope.selectedSettings.isSaved;

                if (!scope.selectedSettings.dataHeaders) {
                    // Prepare dataHeaders for this new query
                    scope.selectedSettings.dataHeaders = [];
                    var tableHeaders = Analytics.getDefaultDataHeaders(
                        scope.selectedSettings.type,
                        scope.selectedSettings.dateGroupBy,
                        $rootScope.role
                    );
                    tableHeaders.forEach(function(header) {
                        if (header.selected) {
                            scope.selectedSettings.dataHeaders.push(header.name);
                        }
                    });
                }

                // Watching for selectedSettings changes
                scope._selectedSettingsInit = angular.copy(scope.selectedSettings);
                scope.$watch('selectedSettings', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        if (!angular.equals(newVal, scope._selectedSettingsInit)) {
                            // scope.queryParamSaved = false;
                            scope.dirty = true;
                        }
                    }
                }, true);

                var deferred = $q.defer();
                var promise = deferred.promise;

                /**
                 * Use promise to get all filter options(campaigns, sites, countries & regions),
                 * after all needed filter options are fetched, then launch the query
                 */
                promise
                .then(function() {
                    if (scope.availableSettings.campaignFilter) {
                        // has campaign filter, should get all campaigns for current user
                        scope.allCampaigns = [];
                        return Advertiser.query(function(advertisers) {
                            advertisers.forEach(function(advertiser) {
                                scope.allCampaigns = scope.allCampaigns.concat(advertiser.campaigns);
                            });
                            // setup default selected campaign filter
                            if (scope.selectedSettings.campaign) {
                                for (var i = 0; i < scope.allCampaigns.length; i ++) {
                                    if (scope.allCampaigns[i]._id === scope.selectedSettings.campaign) {
                                        scope.filters.campaignObject = scope.allCampaigns[i];
                                    }     
                                }
                            }
                        });
                    }
                })
                .then(function() {
                    if (scope.availableSettings.siteFilter) {
                        // has site filter, should get all sites for current user   
                        scope.allSites = [];
                        return Publisher.query(function(publishers) {
                            publishers.forEach(function(publisher) {
                                scope.allSites = scope.allSites.concat(publisher.sites);
                            });
                            // setup default selected site filter
                            if (scope.selectedSettings.site) {
                                for (var i = 0; i < scope.allSites.length; i ++) {
                                    if (scope.allSites[i]._id === scope.selectedSettings.site) {
                                        scope.filters.siteObject = scope.allSites[i];
                                    }
                                }
                            }
                        });
                    }
                })
                .then(function() {
                    if (scope.availableSettings.countryFilter) {
                        if (scope.selectedSettings.country) {
                            scope.selectedCountryId = scope.selectedSettings.country;
                        } else if ($stateParams.countryId) {
                            scope.selectedCountryId = $stateParams.countryId;
                        } else {
                            scope.selectedCountryId = user.organization.country;
                        }
                        // has country filter, should get all countries for current user
                        return Country.query().$promise
                        .then(function(response) {
                            scope.allCountries = response;
                            // setup default selected country based on user country
                            for (var i = 0; i < scope.allCountries.length; i ++) {
                                if (scope.allCountries[i]._id === scope.selectedCountryId) {
                                    scope.geo.countryObject = scope.allCountries[i];
                                    scope.selectedSettings.country = scope.geo.countryObject._id;
                                    break;
                                }
                            }
                        });
                    }
                })
                .then(function() {
                    if (scope.availableSettings.regionFilter) {
                        if (scope.selectedSettings.region) {
                            scope.selectedRegionIdOrName = scope.selectedSettings.region;
                        } else if ($stateParams.regionId) {
                            scope.selectedRegionIdOrName = scope.selectedCountryId + '-' + $stateParams.regionId;
                        } else {
                            scope.selectedRegionIdOrName = user.organization.state;
                        }
                        // has region filter, should get all regions for the user's country
                        return Region.query({
                            country: scope.selectedCountryId
                        }).$promise.then(function(response) {
                            scope.regions = response;
                            // setup default selected region based on user's region
                            for (var i = 0; i < scope.regions.length; i ++) {
                                if (scope.selectedRegionIdOrName === scope.regions[i].name ||
                                    scope.selectedRegionIdOrName === scope.regions[i]._id) {
                                    scope.geo.regionObject = scope.regions[i];
                                    scope.selectedSettings.region = scope.geo.regionObject._id;
                                    break;
                                }
                            }
                        });
                    }
                })
                .then(function() {
                    scope.launchQuery();
                })
                .catch(function(error) {
                    Notify.alert(error.message, {
                        status: 'danger'
                    });
                });

                deferred.resolve();

                scope.launchQuery = function() {
                    $rootScope.$broadcast('queryStarted');

                    var queryResults;
                    var args;
                    // only pass JSON of object to query function, not whole resource if
                    // object is a resource
                    try {
                        args = scope.selectedSettings.toJSON();
                    } catch (e) {
                        args = scope.selectedSettings;
                    }
                    Analytics.queryFunction(scope.selectedSettings.type, $rootScope.role)(args)
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
                        scope.selectedDateRange = response.dateRange;

                        var isPaginated = scope.selectedSettings.resultsPage;

                        $rootScope.$broadcast('queryEnded', {
                            queryParam: scope.selectedSettings,
                            dateRange: scope.selectedDateRange,
                            results: isPaginated ? queryResults.results : queryResults,
                            count: isPaginated ? queryResults.count : null,
                            pages: isPaginated ? queryResults.pages : null,

                            // for geo query only
                            country: scope.geo.countryObject,
                            region: scope.geo.regionObject
                        });
                    })
                    .catch(function(error) {
                        Notify.alert('Error on query'); 
                        $rootScope.$broadcast('queryError');
                    });
                };

                /**
                 * Listener to refresh query if event is broadcast, taking queryParam changes
                 * as args.
                 */
                scope.$on('refreshQuery', function(event, args){
                    _.extend(scope.selectedSettings, args);
                    scope.launchQuery();
                });

                scope.dateGroupByChanged = function(dateGroupBy) {
                    scope.selectedSettings.dateGroupBy = dateGroupBy;
                    // date group by changed, dataHeaders need to be updated as well
                    var headers = Analytics.getDefaultDataHeaders(
                        scope.selectedSettings.type,
                        scope.selectedSettings.dateGroupBy,
                        $rootScope.role
                    );
                    var selectedDataHeaders = [];
                    headers.forEach(function(header) {
                        if (header.selected === true) {
                            selectedDataHeaders.push(header.name);
                        }
                    });
                    scope.selectedSettings.dataHeaders = selectedDataHeaders;
                };

                scope.campaignSelected = function() {
                    if (scope.filters.campaignObject) {
                        scope.selectedSettings.campaign = scope.filters.campaignObject._id;
                    } else {
                        scope.selectedSettings.campaign = '';
                    }
                };

                scope.siteSelected = function() {
                    if (scope.filters.siteObject) {
                        scope.selectedSettings.site = scope.filters.siteObject._id;
                    } else {
                        scope.selectedSettings.site = '';
                    }
                };

                scope.geo = {};
                scope.countrySelected = function() {
                    if (scope.geo.countryObject) {
                        scope.selectedSettings.country = scope.geo.countryObject._id;
                        // Country selected, get its regions
                        Region.query({
                            country: scope.selectedSettings.country
                        }).$promise.then(function(response) {
                            // reset region
                            scope.regions = response;
                            scope.geo.regionObject = undefined;
                            scope.selectedSettings.region = '';
                        }, function(error) {
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

                scope.update = function(){
                    new Query(scope.selectedSettings).$update(function(response) {
                        Notify.alert("Query updated successfully!", {
                            status: 'success'
                        });
                        scope._selectedSettingsInit = angular.copy(scope.selectedSettings);
                        // scope.queryParamSaved = true;
                        scope.dirty = false;
                    }, function(error) {
                        Notify.alert(error.message, {
                            status: 'danger'
                        });
                    });
                };

                scope.showEditScheduleDialog = function(){
                    var parentScope = scope;
                    ngDialog.open({
                        template: 'modules/analytics/views/partials/edit-schedule.html',
                        controller: ['$scope', '$state', 'CRONTAB_DAY_OPTIONS', 'Notify', 'Query',function($scope, $state, CRONTAB_DAY_OPTIONS, Notify, Query) {

                            $scope.selectedSettings = parentScope.selectedSettings;
                            $scope.crontabDayOptions = CRONTAB_DAY_OPTIONS;
                            $scope.isScheduled = false;
                            $scope.crontabAmPm = 'AM';

                            // currently editing existing schedule
                            if ($scope.selectedSettings.schedule){
                                var crontabInfo = Analytics.translateCrontabString($scope.selectedSettings.schedule);
                                $scope.crontabDay = crontabInfo.crontabDay;
                                $scope.crontabHour = crontabInfo.crontabHour;
                                $scope.crontabMinute = crontabInfo.crontabMinute;
                                $scope.crontabAmPm = crontabInfo.crontabAmPm;
                            }

                            $scope.clearSchedule = function(){
                                $scope.selectedSettings.schedule = null;
                                $scope.crontabDay = null;
                                $scope.crontabHour = null;
                                $scope.crontabMinute = null;
                                $scope.crontabAmPm = null;
                            };

                            $scope.editSchedule = function() {
                                $scope.selectedSettings.schedule = $scope.selectedSettings.schedule ? Analytics.adjustCrontabStringForTimezone($scope.crontabDay, $scope.crontabHour, $scope.crontabMinute, $scope.crontabAmPm) : null;
                                $scope.closeThisDialog(0);
                                parentScope.update();
                            };
                        }]
                    });
                };
                scope.showSaveOrScheduleQueryDialog = function() {
                    var parentScope = scope;

                    // Decide the purpose of this dialog so as to decide which template to load, purpose could be
                    // a. save query or
                    // b. save & schedule query
                    var template;
                    if (!parentScope.selectedSettings.schedule) {
                        template = 'modules/analytics/views/partials/save-schedule-query.html';
                    } else {
                        template = 'modules/analytics/views/partials/save-query.html';
                    }
                    ngDialog.open({
                        template: template,
                        controller: ['$scope', '$state', 'CRONTAB_DAY_OPTIONS', 'Notify', 'Query',function($scope, $state, CRONTAB_DAY_OPTIONS, Notify, Query) {

                            $scope.selectedSettings = parentScope.selectedSettings;
                            $scope.crontabDayOptions = CRONTAB_DAY_OPTIONS;
                            $scope.isScheduled = false;
                            $scope.crontabAmPm = 'AM';
                            
                            $scope.editSchedule = function() {
                                $scope.selectedSettings.schedule = Analytics.adjustCrontabStringForTimezone($scope.crontabDay, $scope.crontabHour, $scope.crontabMinute, $scope.crontabAmPm);
                                $scope.closeThisDialog(0);
                            };

                            $scope.saveQuery = function() {
                                // update this query by setting `isSaved` to true and also `schedule` field if any by posting query param to backend
                                var wasSaved = angular.copy($scope.selectedSettings.isSaved);
                                $scope.selectedSettings.isSaved = true;
                                new Query($scope.selectedSettings).$update(function(response) {
                                    Notify.alert("Query saved successfully! You can now view this query under My Queries.", {
                                        status: 'success'
                                    });
                                    if (!wasSaved){
                                        $scope.closeThisDialog(0);
                                        parentScope.queryParamSaved = true;
                                        $state.go('app._analytics.analytics.myQueriesList.myQuery', { queryId: response.id });
                                    } else {
                                        $scope.closeThisDialog(0);
                                        // update client side query save flag
                                        parentScope.queryParamSaved = true;
                                    }
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

                // Watcher for endDate that adds 1 day to endDate so results are inclusive of end date.
                scope.$watch('selectedSettings.endDate', function(newVal, oldVal){
                    if (newVal !== oldVal && typeof newVal=== 'object'){
                        newVal.setDate(newVal.getDate() + 1);
                    }
                });

                scope.getCustomHumanizedDateRange = function() {
                    // var format = 'MMMM Do YYYY hh:mm a z';
                    var format = 'LLL';
                    var momentStartDate = moment.tz(scope.selectedSettings.startDate, user.tz).format(format);
                    var momentEndDate = moment.tz(scope.selectedSettings.endDate, user.tz).endOf('day').format(format);
                    if (scope.selectedSettings.startDate && scope.selectedSettings.endDate) {
                        scope.selectedSettings.humanizedDateRange = momentStartDate + ' - ' + momentEndDate;
                    }
                };

                scope.perPageOptions = [ 5, 10, 25, 50, 100 ];
                var sortFields = [
                    { id:"imps", alias: "Impressions" },
                    { id:"bids", alias: "Bids" },
                    { id:"defaults", alias: "Defaults" },
                    { id:"clicks", alias: "Clicks" },
                    { id:"clearprice", alias: "Avg. Clear Price" },
                    { id:"spend", alias: "Spend" },
                    { id:"view_convs", alias: "View-Through Actions" },
                    { id:"click_convs", alias: "Click-Through Actions" }
                ];
                var sortOptions = [];
                sortFields.forEach(function(field){
                    sortOptions.push({
                        name: field.alias + " (Asc.)",
                        id: field.id + ",asc"
                    });
                    sortOptions.push({
                        name: field.alias + " (Desc.)",
                        id: field.id + ",desc"
                    });
                });
                scope.sortOptions = sortOptions;

                $rootScope.globalSort = {};
                scope.$watch('selectedSettings.sort', function(newVal, oldVal){
                    var headerMap = {
                        "imps": "Impressions",
                        "clicks": "Clicks",
                        "bids": "Bids",
                        "clearprice": "Avg. Clear Price",
                        "spend": "Revenue",
                        "defaults": "Defaults",
                        "view_convs": "View-Through Actions",
                        "click_convs": "Click-Through Actions"
                    };
                    if (newVal){
                        var sortArr = newVal.split(",");
                        if (sortArr.length > 1){
                            $rootScope.globalSort.order = sortArr[1];
                        } else {
                            $rootScope.globalSort.order = 'asc';
                        }
                        if (headerMap.hasOwnProperty(sortArr[0])){
                            $rootScope.globalSort.column = headerMap[sortArr[0]];
                        }
                    }
                });
            }
        };
    }
]);
