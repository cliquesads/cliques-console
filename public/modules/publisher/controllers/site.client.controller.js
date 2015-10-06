/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('SiteController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Publisher','DTOptionsBuilder', 'DTColumnDefBuilder','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog','PUBLISHER_TOOLTIPS',
	function($scope, $stateParams, $location, Authentication, Publisher, DTOptionsBuilder, DTColumnDefBuilder, HourlyAdStat, MongoTimeSeries, aggregationDateRanges,ngDialog,PUBLISHER_TOOLTIPS) {
		$scope.authentication = Authentication;
        $scope.TOOLTIPS = PUBLISHER_TOOLTIPS;
        $scope.publishers = Publisher.query();

		$scope.update = function() {
			var publisher = $scope.publisher;

			publisher.$update(function(){}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

        //$scope.findPublishers = function() {
        //    // on query return, get site spend data to augment $scope.publishers
        //    $scope.publishers = Publisher.query();
        //};
		$scope.findOne = function() {
			Publisher.get({publisherId: $stateParams.publisherId})
                .$promise
                .then(function(publisher){
                    $scope.publisher = publisher;
                    var i = _.findIndex($scope.publisher.sites, function(site){
                        return site._id === $stateParams.siteId;
                    });
                    //$scope.site as pointer to site in publisher.sites array
                    //this way, all Publisher resource methods will work
                    $scope.site = $scope.publisher.sites[i];
                });
		};

        // Listener to update quickstats when publisher var changes
        $scope.$watch(function(scope){ return scope.publisher; }, function(newAdv, oldAdv){
            if (newAdv){
                HourlyAdStat.pubQuery({publisherId: newAdv._id},{
                    groupBy: 'site'
                }).then(function(response){
                    response.data.forEach(function(site_data){
                        var i = _.findIndex($scope.publisher.sites, function(site){
                            return site._id === site_data._id.site;
                        });
                        // augment site w/ site quickstats
                        $scope.publisher.sites[i].percent_spent = (site_data.spend/ $scope.publisher.sites[i].budget).toFixed(4);
                        $scope.publisher.sites[i].imps = site_data.imps;
                        $scope.publisher.sites[i].clicks = site_data.clicks;
                        $scope.publisher.sites[i].ctr = (site_data.clicks / site_data.imps).toFixed(4);
                        $scope.publisher.sites[i].spend = site_data.spend;
                        $scope.publisher.sites[i].ecpm = ((site_data.spend / site_data.imps) * 1000).toFixed(4);
                    });
                });
            }
        });

        // ######################################### //
        // ######### EDIT DIALOG HANDLERS ########## //
        // ######################################### //
        $scope.editPage = function(page){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/publisher/views/partials/edit-page.html',
                controller: 'editPageController',
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
                template: 'modules/publisher/views/partials/edit-page.html',
                controller: 'editPageController',
                data: {publisher: $scope.publisher, site: $scope.site, page: newPage},
                preCloseCallback: function(value){
                    if (value != 'Success'){
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
                    $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                        {fields: ['imps',{'CTR': function(row){return row.clicks / row.imps;}}, 'clicks','spend', 'view_convs', 'click_convs']});
                    $scope.impressions = _.sum($scope.timeSeries.imps, function(item){ return item[1];});
                    $scope.clicks = _.sum($scope.timeSeries.clicks, function(item){ return item[1];});
                    $scope.spend = _.sum($scope.timeSeries.spend, function(item){ return item[1];});
                    $scope.actions = _.sum($scope.timeSeries.view_convs, function(item){ return item[1];}) + _.sum($scope.timeSeries.click_convs, function(item){ return item[1];});
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
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
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
                    startDate: startDate,
                    endDate: endDate
                }).then(function(response){
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
]);