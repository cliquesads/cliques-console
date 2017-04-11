/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$scope', '$rootScope', '$stateParams', 'aggregationDateRanges', '$state', 'Analytics', 'QUICKQUERIES', 'QUERY_ROUTES', 'Notify', 'ngDialog',
    function($scope, $rootScope, $stateParams, aggregationDateRanges, $state, Analytics, QUICKQUERIES, QUERY_ROUTES, Notify, ngDialog) {
        $scope.views = null;
        // Depending on different organization type, quick query options may vary
        $scope.quickQueries = QUICKQUERIES[user.organization.effectiveOrgType];
        $scope.queryRoutes = QUERY_ROUTES;
        /********************** DEFAULT QUERY PARAM VALUES **********************/
        $scope.dateRanges = aggregationDateRanges(user.tz);
        if ($stateParams.query) {
            // History query entered from sidebar
            $scope.defaultQueryParam = $stateParams.query;
            $scope.defaultQueryParam.savedQueryId = $scope.defaultQueryParam._id;
            $scope.defaultQueryParam._id = undefined;
            // delete groupBy
            delete $scope.defaultQueryParam.groupBy;
            // delete date related
            delete $scope.defaultQueryParam.createdAt;
            delete $scope.defaultQueryParam.updatedAt;
            delete $scope.defaultQueryParam.nextRun;
        } else {
            $scope.defaultQueryParam = {
                name: '',
                dateRangeShortCode: '7d',
                dateGroupBy: 'day',
                humanizedDateRange: 'Last 7 Days'
            };
        }
        if ($scope.defaultQueryParam.dateRangeShortCode !== 'custom') {
            $scope.defaultQueryParam.startDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].startDate;
            $scope.defaultQueryParam.endDate = $scope.dateRanges[$scope.defaultQueryParam.dateRangeShortCode].endDate;
        } else {
            var dateArr = $scope.defaultQueryParam.humanizedDateRange.split(' - ');
            $scope.defaultQueryParam.startDate = dateArr[0];
            $scope.defaultQueryParam.endDate = dateArr[1];
        }

        /********************** FILTER OPTIONS FOR CREATIVES/SITES **********************/
        $scope.hasCampaignFilter = false;
        $scope.hasSiteFilter = false;
        switch (user.organization.effectiveOrgType) {
            case 'networkAdmin':
                $scope.hasCampaignFilter = true;
                $scope.hasSiteFilter = true;
                break;
            case 'advertiser':
                $scope.hasCampaignFilter = true;
                break;
            case 'publisher':
                $scope.hasSiteFilter = true;
                break;
            default:
                break;
        }

        /******************** DIFFERENT QUERY ENTRIES/SECTIONS ********************/
        // set query name, filters and available report settings depending on what current state/query section it is
        $scope.availableSettings = {
            timePeriod: true,
            dateGroupBy: false,
            campaignFilter: $scope.hasCampaignFilter,
            siteFilter: $scope.hasSiteFilter
        };
        $scope.hasTable = true;
        $scope.hasGraph = false;

        if ($scope.availableSettings.campaignFilter) {
            // has campaign fileter, should get all campaigns for current user
            Analytics.getAllCampaigns()
                .success(function(data) {
                    $scope.allCampaigns = data;
                })
                .error(function(error) {
                    Notify.alert(error.message, {
                        status: 'danger'
                    });
                });
        }
        if ($scope.availableSettings.siteFilter) {
            // has site filter, should get all sites for current user   
            Analytics.getAllSites()
                .success(function(data) {
                    $scope.allSites = data;
                })
                .error(function(error) {
                    Notify.alert(error.message, {
                        status: 'danger'
                    });
                });
        }

        var currentQueryType;
        for (var queryType in $scope.queryRoutes) {
            if ($state.current.name === $scope.queryRoutes[queryType]) {
                currentQueryType = queryType;
                break;
            }
        }
        $scope.defaultQueryParam.name = currentQueryType;
        $scope.defaultQueryParam.type = currentQueryType;

        // groupBy and populate parameter
        var groupByFields = ['advertiser', 'publisher'];
        if (currentQueryType && currentQueryType !== 'time' && currentQueryType !== 'custom') {
            groupByFields.push(currentQueryType);
        }

        $scope.defaultQueryParam.groupBy = groupByFields.join();
        $scope.defaultQueryParam.populate = $scope.defaultQueryParam.groupBy;

        // Set available report settings for different queries
        if (currentQueryType === 'time' || currentQueryType === 'custom') {
            $scope.hasGraph = true;
            $scope.availableSettings.dateGroupBy = true;
        }

        $scope.goToQuerySection = function(queryType) {
            $state.go($scope.queryRoutes[queryType]);
        };

        /************************ CUSTOM QUERY & RESULTS ************************/
        $scope.showSaveQueryDialog = function() {
            if ($scope.defaultQueryParam.isSaved) {
                var parentScope = $scope;
                ngDialog.open({
                    template: 'modules/analytics/views/partials/save-query-dialog.html',
                    controller: ['$scope', 'CRONTAB_DAY_OPTIONS', function($scope, CRONTAB_DAY_OPTIONS) {

                        $scope.selectedSettings = parentScope.defaultQueryParam;
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
            $state.go('app.analytics.customizeQuery.queryResult', {defaultQueryParam: $scope.defaultQueryParam});
        };
    }
]).controller('CustomQueryResultsController', [
    '$scope',
    '$state',
    '$stateParams',
    function($scope, $state, $stateParams) {
    if ($stateParams.defaultQueryParam) {
        $scope.defaultQueryParam = $stateParams.defaultQueryParam;
    } else {
        $state.go('app.analytics.customizeQuery');
    }
}]);
