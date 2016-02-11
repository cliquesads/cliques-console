/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('PageController', ['$scope','$stateParams','Publisher','PUBLISHER_TOOLTIPS','OPENRTB','CREATIVE_SIZES','HourlyAdStat','aggregationDateRanges','Authentication','Notify',
	function($scope,$stateParams, Publisher, PUBLISHER_TOOLTIPS, OPENRTB, CREATIVE_SIZES, HourlyAdStat, aggregationDateRanges, Authentication, Notify){
        $scope.authentication = Authentication;

        $scope.getPositionByCode = function(code){
            return OPENRTB.positions.filter(function(pos){ return pos.code === code; })[0];
        };

        function setPage(){
            // Set refs to nested documents in parent Publisher so $update method
            // can be used.  Don't know if this is entirely necessary but doing
            // to be safe, as I find Angular's handling of object refs kind of confusing
            var site_ind = _.findIndex($scope.publisher.sites, function(site){
                return site._id === $stateParams.siteId;
            });
            $scope.site = $scope.publisher.sites[site_ind];

            var page_ind = _.findIndex($scope.site.pages, function(page){
                return page._id === $stateParams.pageId;
            });
            $scope.page = $scope.site.pages[page_ind];
        }

        $scope.findOne = function() {
            Publisher.get({publisherId: $stateParams.publisherId})
                .$promise
                .then(function(publisher){
                    $scope.publisher = publisher;
                    setPage();
                });
        };

        // Only accessible to admins
        $scope.togglePageActive = function(){
            if (!this.page.active){
                this.page.placements.forEach(function(placement){
                    placement.active = false;
                });
                this.publisher.$update(function(response){
                    Notify.alert('Your page was successfully deactivated.',{});
                    setPage();
                }, function(errorResponse){
                    Notify.alert('Error deactivating page: ' + errorResponse.message,{status: 'danger'});
                });
            } else {
                this.page.placements.forEach(function(placement){
                    placement.active = true;
                });
                this.publisher.$update(function(response){
                    Notify.alert('Your page was successfully activated. Let\'s do this thing.',{});
                    setPage();
                }, function(errorResponse){
                    Notify.alert('Error activating page: ' + errorResponse.message,{status: 'danger'});
                });
            }
        };

        // See service in aggregations module for details on aggregationDateRanges object
        $scope.dateRangeSelection = "7d";
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.getQuickStats = function(dateShortCode){
            var startDate = $scope.dateRanges[dateShortCode].startDate;
            var endDate = $scope.dateRanges[dateShortCode].endDate;
            $scope.dateRangeSelection = dateShortCode;
            // query HourlyAdStats api endpoint
            HourlyAdStat.pubQuery({
                publisherId: $stateParams.publisherId,
                siteId: $stateParams.siteId,
                pageId: $stateParams.pageId
            },{
                startDate: startDate,
                endDate: endDate
            }).then(function(response){
                $scope.quickStats = response.data;
            });
        };

        $scope.updateAndClose = function(){
            var valid = $('#placementForm').parsley().validate() && $('#pageForm').parsley().validate();
            if (valid){
                this.page.placements.forEach(function(placement){
                    if (!placement.w && !placement.h){
                        var dims = placement.dimensions.split('x');
                        placement.w = Number(dims[0]);
                        placement.h = Number(dims[1]);
                    }
                });
                this.publisher.$update(function() {
                    $scope.closeThisDialog('Success');
                }, function(errorResponse){
                    $scope.saveerror = errorResponse.data.message;
                });
            } else {
                return false;
            }
        };
	}
]);