/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('SiteController',
    function($scope, $stateParams, $location, Authentication, Publisher, site, DTOptionsBuilder, DTColumnDefBuilder,
             HourlyAdStat, MongoTimeSeries, aggregationDateRanges,ngDialog,PUBLISHER_TOOLTIPS, Notify,REVIEW_TIME,
             CLIQUE_ICON_CLASSES) {

        $scope.CLIQUE_ICON_CLASSES = CLIQUE_ICON_CLASSES;
		$scope.authentication = Authentication;
        $scope.TOOLTIPS = PUBLISHER_TOOLTIPS;
        $scope.site = site.site;
        $scope.publisher = site.publisher;
        $scope.siteIndex = site.index;

        /**
         * Overlap publisher helper modal if state includes necessary query params
         */
        $scope.newModal = function(){
            ngDialog.open({
                template: 'modules/publisher/views/partials/new-site-helper-modal.html',
                data: { review_time: REVIEW_TIME }
            });
        };
        // this activates the modal
        $scope.showNewModal = function(){
            if ($location.search().newModal){
                $scope.newModal();
            }
        };

		$scope.update = function() {
			$scope.publisher.$update(function(){
                $scope.site = $scope.publisher.sites[$scope.siteIndex];
            }, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

        // Only accessible to admins
        $scope.toggleSiteActive = function(){
            if (!this.site.active){
                this.site.pages.forEach(function(page){
                    page.active = false;
                    page.placements.forEach(function(placement){
                        placement.active = false;
                    });
                });
                this.publisher.$update(function(response){
                    Notify.alert('Your site was successfully deactivated.',{});
                    $scope.site = $scope.publisher.sites[$scope.siteIndex];
                }, function(errorResponse){
                    Notify.alert('Error deactivating site: ' + errorResponse.message,{status: 'danger'});
                });
            } else {
                this.site.pages.forEach(function(page){
                    page.active = true;
                    page.placements.forEach(function(placement){
                        placement.active = true;
                    });
                });
                this.publisher.$update(function(response){
                    Notify.alert('Your site was successfully activated. Let\'s do this thing.',{});
                    $scope.site = $scope.publisher.sites[$scope.siteIndex];
                }, function(errorResponse){
                    Notify.alert('Error activating site: ' + errorResponse.message,{status: 'danger'});
                });
            }
        };

        // ######################################### //
        // ######### EDIT DIALOG HANDLERS ########## //
        // ######################################### //
        $scope.editPage = function(page){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/publisher/views/partials/edit-page.html',
                controller: 'PageController',
                data: {publisher: $scope.publisher, site: $scope.site, page: page}
            });
        };
        $scope.newPage = function(){
            var newPage = {
                clique: $scope.site.clique,
                placements: []
            };
            $scope.site.pages.push(newPage);
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/publisher/views/partials/new-page.html',
                controller: 'newPageController',
                data: {publisher: $scope.publisher, site: $scope.site, page: newPage},
                preCloseCallback: function(value){
                    if (value !== 'Success'){
                        var page_ind = _.findIndex($scope.site.pages, function(page){
                            return page === newPage;
                        });
                        $scope.$apply(function(){
                            $scope.site.pages.splice(page_ind, 1);
                        });
                        return true;
                    }
                }
            });
        };


        // ######################################### //
        // ######### GRAPH VARS & FUNCTIONS ######## //
        // ######################################### //

        // build datatables options object
        $scope.dtOptions = DTOptionsBuilder.newOptions();
        $scope.dtOptions.withOption('paging', false);
        $scope.dtOptions.withOption('searching', false);
        $scope.dtOptions.withOption('scrollX', true);
        $scope.dtOptions.withOption('order', [[4,'desc']]);
        // Not entirely sure if this is necessary
        $scope.dtColumnDefs = [
            DTColumnDefBuilder.newColumnDef(0),
            DTColumnDefBuilder.newColumnDef(1),
            DTColumnDefBuilder.newColumnDef(2),
            DTColumnDefBuilder.newColumnDef(3),
            DTColumnDefBuilder.newColumnDef(4),
            DTColumnDefBuilder.newColumnDef(5),
            DTColumnDefBuilder.newColumnDef(6)
        ];

        // build datatables options object
        $scope.dtOptions_adv = DTOptionsBuilder.newOptions();
        $scope.dtOptions_adv.withOption('paging', false);
        $scope.dtOptions_adv.withOption('searching', false);
        $scope.dtOptions_adv.withOption('scrollX', true);
        $scope.dtOptions_adv.withOption('order', [[3,'desc']]);
        // Not entirely sure if this is necessary
        $scope.dtColumnDefs_adv = [
            DTColumnDefBuilder.newColumnDef(0),
            DTColumnDefBuilder.newColumnDef(1),
            DTColumnDefBuilder.newColumnDef(2),
            DTColumnDefBuilder.newColumnDef(3),
            DTColumnDefBuilder.newColumnDef(4),
            DTColumnDefBuilder.newColumnDef(5)
        ];

        // See service in aggregations module for details on aggregationDateRanges object
        $scope.dateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.tabFunctions = {
            summary: function(dateShortCode){
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;
                // Pass "show-points" to graph directive to toggle line points
                // Only have this so points won't show for lines with tons of data
                $scope.showPoints = $scope.dateRanges[dateShortCode].showPoints;
                // For grouping & MongoTimeSeries generation
                var timeUnit = 'day';
                // query HourlyAdStats api endpoint
                HourlyAdStat.pubQuery({
                    publisherId: $stateParams.publisherId,
                    siteId: $stateParams.siteId
                },{
                    dateGroupBy: timeUnit,
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
                    $scope.siteTimeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                        {fields: ['imps',{'CTR': function(row){return row.clicks / row.imps;}}, 'defaults','clicks','spend', 'view_convs', 'click_convs']});
                    $scope.impressions = _.sumBy($scope.siteTimeSeries.imps, function(item){ return item[1];});
                    $scope.defaults = _.sumBy($scope.siteTimeSeries.defaults, function(item){ return item[1];});
                    $scope.clicks = _.sumBy($scope.siteTimeSeries.clicks, function(item){ return item[1];});
                    $scope.spend = _.sumBy($scope.siteTimeSeries.spend, function(item){ return item[1];});
                    $scope.actions = _.sumBy($scope.siteTimeSeries.view_convs, function(item){ return item[1];}) + _.sumBy($scope.siteTimeSeries.click_convs, function(item){ return item[1];});
                    $scope.CTR = $scope.clicks / $scope.impressions;
                });
                // TODO: Need to provide error callback for query promise as well
            },
            placements: function(dateShortCode){
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;
                // query HourlyAdStats api endpoint
                HourlyAdStat.pubQuery({
                    publisherId: $stateParams.publisherId,
                    siteId: $stateParams.siteId
                },{
                    groupBy: 'page,placement',
                    populate: 'page,placement',
                    advertiser: '{ne}null',
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
                    $scope.placementData = response.data;
                }, function(err){
                    console.log(err);
                });
            },
            campaigns: function(dateShortCode){
                var startDate = $scope.dateRanges[dateShortCode].startDate;
                var endDate = $scope.dateRanges[dateShortCode].endDate;
                // query HourlyAdStats api endpoint
                HourlyAdStat.pubQuery({
                    publisherId: $stateParams.publisherId,
                    siteId: $stateParams.siteId
                },{
                    groupBy: 'advertiser',
                    populate: 'advertiser',
                    advertiser: '{ne}null',
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
                    $scope.campaignData = response.data;
                }, function(err){
                    console.log(err);
                });
            }
        };
        $scope.activeTab = 'summary';
        $scope.getTabData = function(dateShortCode, tab){
            tab = tab || $scope.activeTab;
            $scope.activeTab = tab;
            $scope.tabFunctions[tab](dateShortCode);
            $scope.dateRangeSelection = dateShortCode;
        };
	}
);