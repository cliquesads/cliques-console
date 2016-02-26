/* global _, angular, user */
'use strict';

angular.module('publisher').controller('PublisherController', ['$rootScope','$scope', '$stateParams', '$location',
    'Authentication', 'Publisher','HourlyAdStat','MongoTimeSeries','aggregationDateRanges','ngDialog','PUBLISHER_TOOLTIPS',
	function($rootScope, $scope, $stateParams, $location, Authentication, Publisher, HourlyAdStat, MongoTimeSeries, aggregationDateRanges, ngDialog, PUBLISHER_TOOLTIPS) {
		$scope.authentication = Authentication;
        $scope.TOOLTIPS = PUBLISHER_TOOLTIPS;
        $scope.publishers = Publisher.query();

        $scope.selectPublisher = function(force){
            function openDialog(){
                ngDialog.open({
                    className: 'ngdialog-theme-default dialogwidth600',
                    template: 'modules/publisher/views/partials/list-publisher.html',
                    controller: ['$scope', function ($scope) {
                        $scope.publishers = $scope.ngDialogData.publishers;
                        $scope.rememberSelection = true;
                        $scope.selectAndClose = function(publisher){
                            $scope.closeThisDialog('Success');
                            $location.url('/publisher/' + publisher.id);
                            // Set publisher to rootScope if rememberSelection is true,
                            // otherwise clear rootScope publisher var
                            if ($scope.rememberSelection){
                                $rootScope.publisher = publisher;
                            } else {
                                $rootScope.publisher = null;
                            }

                        };
                        $scope.createPublisher = function(){
                            $scope.closeThisDialog('Success');
                            $location.url('/publisher/create');
                        };
                    }],
                    data: { publishers: $scope.publishers }
                });
            }

            if ($rootScope.publisher && !force){
                $location.url('/publisher/' + $scope.publisher.id);
            } else {
                openDialog()
            }
        };

        $scope.update = function() {
            var publisher = $scope.publisher;
            publisher.$update(function() {
                $location.path('publisher/' + publisher._id);
            }, function(errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };

        $scope.validateInput = function(name, type) {
            var input = this.publisherForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

		$scope.findOne = function() {
			$scope.publisher = Publisher.get({
				publisherId: $stateParams.publisherId
			}, function(){
                HourlyAdStat.pubQuery({publisherId: $stateParams.publisherId},{
                    groupBy: 'site'
                }).then(function(response){
                    response.data.forEach(function(site_data){
                        var i = _.findIndex($scope.publisher.sites, function(site){
                            return site._id === site_data._id.site;
                        });
                        $scope.publisher.sites[i].percent_spent = (site_data.spend/$scope.publisher.sites[i].budget).toFixed(4);
                    });
                });
            });
		};

        $scope.publisherBasics = function(){
            ngDialog.open({
                template: 'modules/publisher/views/partials/publisher-basics.html',
                controller: ['$scope',function($scope){
                    $scope.publisher = $scope.ngDialogData.publisher;
                    $scope.update = $scope.ngDialogData.update;
                }],
                data: {publisher: $scope.publisher, update: $scope.update}
            });
        };

        $scope.newSite = function(){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/publisher/views/partials/create-site.client.view.html',
                controller: 'SiteWizardController',
                data: {publisher: $scope.publisher}
            });
        };


        // ######################################### //
        // ######### GRAPH VARS & FUNCTIONS ######## //
        // ######################################### //

        // See service in aggregations module for details on aggregationDateRanges object
        $scope.dateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);

        $scope.getPublisherGraph = function(dateShortCode){
            dateShortCode = dateShortCode || $scope.dateRangeSelection;
            var startDate = $scope.dateRanges[dateShortCode].startDate;
            var endDate = $scope.dateRanges[dateShortCode].endDate;

            // Pass "show-points" to graph directive to toggle line points
            // Only have this so points won't show for lines with tons of data
            $scope.showPoints = $scope.dateRanges[dateShortCode].showPoints;

            // For grouping & MongoTimeSeries generation
            var timeUnit = 'day';

            // query HourlyAdStats api endpoint
            HourlyAdStat.pubQuery({publisherId: $stateParams.publisherId},{
                dateGroupBy: timeUnit,
                startDate: startDate,
                endDate: endDate
            }).then(function(response){
                $scope.timeSeries = new MongoTimeSeries(response.data, startDate, endDate, user.tz, timeUnit,
                    {fields: ['imps',{'CTR': function(row){return row.clicks / row.imps;}}, 'defaults','clicks','spend']});
                $scope.impressions = _.sumBy($scope.timeSeries.imps, function(item){ return item[1];});
                $scope.defaults = _.sumBy($scope.timeSeries.defaults, function(item){ return item[1];});
                $scope.clicks = _.sumBy($scope.timeSeries.clicks, function(item){ return item[1];});
                $scope.spend = _.sumBy($scope.timeSeries.spend, function(item){ return item[1];});
                $scope.CTR = $scope.clicks / $scope.impressions;
            });
            // TODO: Need to provide error callback for query promise as well

            $scope.dateRangeSelection = dateShortCode;
        };
	}
]);