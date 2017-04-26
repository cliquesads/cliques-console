/* global _, angular, user */
'use strict';

angular.module('analytics').controller('AnalyticsController', ['$rootScope','$scope', '$stateParams', 'aggregationDateRanges', '$state', 'Analytics', 'QUICKQUERIES', 'Notify',
    function($rootScope, $scope, $stateParams, aggregationDateRanges, $state, Analytics, QUICKQUERIES, Notify) {
        $scope.user = user;

        // Depending on different organization type, quick query options may vary
        $scope.quickQueries = QUICKQUERIES[$rootScope.role];
        $scope.currentQueryType = $state.current.queryType;

        /********************** DEFAULT QUERY PARAM VALUES **********************/
        $scope.dateRanges = aggregationDateRanges(user.tz);
        if ($stateParams.query) {
            // History query entered from sidebar
            $scope.defaultQueryParam = $stateParams.query;
            $scope.defaultQueryParam.populate = $scope.defaultQueryParam.groupBy;
            $scope.defaultQueryParam.savedQueryId = $scope.defaultQueryParam._id;
            $scope.defaultQueryParam._id = undefined;
            // delete date related
            delete $scope.defaultQueryParam.createdAt;
            delete $scope.defaultQueryParam.updatedAt;
            delete $scope.defaultQueryParam.nextRun;
        } else if ($scope.currentQueryType) {
            $scope.defaultQueryParam = $scope.quickQueries[$scope.currentQueryType].defaultQueryParam;
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
        }
        $scope.goToQuerySection = function(queryRoute) {
            $state.go(queryRoute);
        };
    }
]).controller('AnalyticsCustomizeController', [
    '$scope', '$rootScope', '$state', '$stateParams', 'ngDialog', 'Analytics', 'CUSTOMQUERY',
    function($scope, $rootScope, $state, $stateParams, ngDialog, Analytics, CUSTOMQUERY) {
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
                        Analytics.saveQuery($scope.selectedSettings)
                        .then(function(response) {
                            // Notify that this query has been saved and inform other directives the saved query id
                            $rootScope.$broadcast('querySaved', {savedQueryId: response.data});
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