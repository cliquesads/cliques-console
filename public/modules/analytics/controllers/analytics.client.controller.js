/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$rootScope','$scope', '$stateParams', 'aggregationDateRanges', '$state', 'Analytics', 'QUICKQUERIES', 'Notify', 'Advertiser', 'Publisher',
    function($rootScope, $scope, $stateParams, aggregationDateRanges, $state, Analytics, QUICKQUERIES, Notify, Advertiser, Publisher) {
        $scope.user = user;

        // Depending on different organization type, quick query options may vary
        $scope.quickQueries = QUICKQUERIES[$rootScope.role];
        $scope.currentQueryType = $state.current.queryType;

        /********************** DEFAULT QUERY PARAM VALUES **********************/
        $scope.dateRanges = aggregationDateRanges(user.tz);
        if ($stateParams.query) {
            // History query entered from sidebar or history query list
            $scope.defaultQueryParam = $stateParams.query;
            $scope.defaultQueryParam.populate = $scope.defaultQueryParam.groupBy;
            // delete date related
            delete $scope.defaultQueryParam.createdAt;
            delete $scope.defaultQueryParam.updatedAt;
            delete $scope.defaultQueryParam.nextRun;
        } else if ($scope.currentQueryType) {
            // new query
            // Copy the relative defaultQueryParam to a new object, so any changes to $scope.defaultQueryParam doesn't alter the values in the original object
            $scope.defaultQueryParam = JSON.parse(JSON.stringify($scope.quickQueries[$scope.currentQueryType].defaultQueryParam));
            // Prepare dataHeaders for this new query
            $scope.defaultQueryParam.dataHeaders = [];
            var tableHeaders = Analytics.getQueryTableHeaders(
                $scope.defaultQueryParam.type,
                $scope.defaultQueryParam.dateGroupBy,
                $rootScope.role,
                null
            );
            tableHeaders.forEach(function(header) {
                if (header.selected) {
                    $scope.defaultQueryParam.dataHeaders.push(header.name);
                }
            });
        }

        if ($scope.defaultQueryParam) {
            if ($scope.defaultQueryParam.dateRangeShortCode !== 'custom') {
                $scope.defaultQueryParam.startDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].startDate;
                $scope.defaultQueryParam.endDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].endDate;
            } else {
                var dateArr = $scope.defaultQueryParam.humanizedDateRange.split(' - ');
                $scope.defaultQueryParam.startDate = dateArr[0];
                $scope.defaultQueryParam.endDate = dateArr[1];
            }
        }

        /************** AVAILABLE SETTINGS FOR QUERY ENTRIES/SECTIONS **************/
        if ($scope.currentQueryType) {
            $scope.availableSettings = $scope.quickQueries[$scope.currentQueryType].availableSettings;
            if ($scope.availableSettings.campaignFilter) {
                // has campaign fileter, should get all campaigns for current user
                var allCampaigns = [];
                Advertiser.query(function(advertisers) {
                    advertisers.forEach(function(advertiser) {
                        allCampaigns = allCampaigns.concat(advertiser.campaigns);
                    });
                    $scope.allCampaigns = allCampaigns;
                });
            }
            if ($scope.availableSettings.siteFilter) {
                // has site filter, should get all sites for current user   
                var allSites = [];
                Publisher.query(function(publishers) {
                    publishers.forEach(function(publisher) {
                        allSites = allSites.concat(publisher.sites);
                    });
                    $scope.allSites = allSites;
                });
            }
        }
        $scope.goToQuerySection = function(queryRoute) {
            $state.go(queryRoute);
        };
    }
]).controller('AnalyticsCustomizeController', [
    '$scope', '$rootScope', '$state', '$stateParams', 'ngDialog', 'Analytics', 'CUSTOMQUERY','Query',
    function($scope, $rootScope, $state, $stateParams, ngDialog, Analytics, CUSTOMQUERY, Query) {
        $scope.availableSettings = CUSTOMQUERY[$rootScope.role].availableSettings;
        if ($stateParams.defaultQueryParam) {
            $scope.defaultQueryParam = $stateParams.defaultQueryParam;
        } else {
            // $state.go('app.analytics.customize');
            $scope.defaultQueryParam = CUSTOMQUERY[$rootScope.role].defaultQueryParam;
        }
        /************************ CUSTOM QUERY & RESULTS ************************/
        $scope.showSaveQueryDialog = function() {
            $scope.defaultQueryParam.isSaved = true;
            var parentScope = $scope;
            ngDialog.open({
                template: 'modules/analytics/views/partials/save-query-dialog.html',
                controller: ['$scope', 'CRONTAB_DAY_OPTIONS', 'Notify', function($scope, CRONTAB_DAY_OPTIONS, Notify) {
                    $scope.selectedSettings = parentScope.defaultQueryParam;
                    $scope.crontabDayOptions = CRONTAB_DAY_OPTIONS;
                    $scope.isScheduled = false;

                    $scope.saveQuery = function() {
                        if ($scope.crontabAmPm === 'PM'){
                            $scope.crontabHour += 12;
                        }
                        if ($scope.isScheduled){
                            $scope.selectedSettings.schedule = $scope.crontabMinute + ' ' + $scope.crontabHour + $scope.crontabDay;
                        }
                        // Post query param to backend
                        new Query($scope.selectedSettings).$create(function(response) {
                            // Notify that this query has been saved and inform other directives the saved query id
                            $rootScope.$broadcast('querySaved', {savedQueryId: response.id});
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

        $scope.timePeriodChanged = function() {
            if ($scope.defaultQueryParam.dateRangeShortCode) {
                // set up start date and end date if not designated as custom dates by user already, also setup date range title for displaying and humanizedDateRange so as to save in database in case needed
                if ($scope.defaultQueryParam.dateRangeShortCode !== 'custom') {
                    $scope.defaultQueryParam.startDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].startDate;
                    $scope.defaultQueryParam.endDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].endDate;
                    // humanizedDateRange setup for selected date short code
                    $scope.defaultQueryParam.humanizedDateRange = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].label;
                } else {
                    // humanizedDateRange setup for custom selected start/end date
                    var momentStartDate = moment($scope.defaultQueryParam.startDate);
                    var momentEndDate = moment($scope.defaultQueryParam.endDate);

                    $scope.defaultQueryParam.humanizedDateRange = momentStartDate.format('YYYY-MM-DD') + ' - ' + momentEndDate.format('YYYY-MM-DD');
                }
            }
        };
        $scope.showCustomizedQueryResult = function() {
            $state.go('app.analytics.customize.result', {defaultQueryParam: $scope.defaultQueryParam});
        };
    }
]);