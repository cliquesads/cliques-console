/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('PageController', ['$scope','$stateParams','Publisher',
    'PUBLISHER_TOOLTIPS','OPENRTB','CREATIVE_SIZES','DEFAULT_TYPES',
    'HourlyAdStat','aggregationDateRanges','Authentication','Notify','ngDialog',
	function($scope,$stateParams, Publisher, PUBLISHER_TOOLTIPS, OPENRTB, CREATIVE_SIZES,
             DEFAULT_TYPES, HourlyAdStat, aggregationDateRanges, Authentication, Notify, ngDialog){
        $scope.DEFAULT_TYPES = DEFAULT_TYPES;
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

        $scope.update = function() {
            $scope.publisher.$update(function(){
                setPage();
            }, function(errorResponse) {
                $scope.error = errorResponse.data.message;
            });
        };

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

        /**
         * Utils to get QuickStats
         * @type {string}
         */
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

        var placementSaveCallback = function(newPublisher){
            $scope.publisher = newPublisher;
            setPage();
        };

        $scope.editPlacementBasics = function(placement){
            ngDialog.open({
                className: 'ngdialog-theme-default',
                template: '<placement-basics publisher="publisher" page="page" placement="placement" on-save-success="onSaveSuccess(publisher)"></placement-basics>',
                plain: true,
                controller: ['$scope',function($scope){
                    $scope.publisher = $scope.ngDialogData.publisher;
                    $scope.page = $scope.ngDialogData.page;
                    $scope.placement = $scope.ngDialogData.placement;
                    $scope.onSaveSuccess = function(publisher) {
                        $scope.closeThisDialog('Success');
                        placementSaveCallback(publisher);

                    };
                }],
                data: { publisher: $scope.publisher, placement: placement, page: $scope.page }
            });
        };

        $scope.newPlacement = function(){
            var newPlacement = {};
            $scope.page.placements.push(newPlacement);
            ngDialog.open({
                className: 'ngdialog-theme-default',
                template: '<placement-basics publisher="publisher" page="page" placement="placement" on-save-success="onSaveSuccess(publisher)"></placement-basics>',
                plain: true,
                controller: ['$scope',function($scope){
                    $scope.publisher = $scope.ngDialogData.publisher;
                    $scope.page = $scope.ngDialogData.page;
                    $scope.placement = $scope.ngDialogData.placement;
                    $scope.onSaveSuccess = function(publisher){
                        $scope.closeThisDialog('Success');
                        placementSaveCallback(publisher);
                    };
                }],
                data: { publisher: $scope.publisher, page: $scope.page, placement: newPlacement },
                preCloseCallback: function(value){
                    if (value != 'Success'){
                        var placement_ind = _.findIndex($scope.page.placements, function(pl){
                            return pl === newPlacement;
                        });
                        $scope.$apply(function(){
                            $scope.page.placements.splice(placement_ind, 1);
                        });
                        return true;
                    }
                }
            });
        };

        $scope.editDefaultCondition = function(placement){
            var initDefaultType = placement.defaultType;
            var initPassbackTag = placement.passbackTag;
            var initHostedCreatives = placement.hostedCreatives;
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/publisher/views/partials/edit-default-condition.html',
                controller: 'DefaultConditionController',
                data: {publisher: $scope.publisher, placement: placement },
                preCloseCallback: function(value){
                    if (value != 'Success'){
                        var placement_ind = _.findIndex($scope.page.placements, function(pl){
                            return pl._id === placement._id;
                        });
                        $scope.$apply(function(){
                            $scope.page.placements[placement_ind].defaultType = initDefaultType;
                            $scope.page.placements[placement_ind].passbackTag = initPassbackTag;
                            $scope.page.placements[placement_ind].hostedCreatives = initHostedCreatives;
                        });
                        return true;
                    }
                }
            });
        };

        /**
         * Handler for get Ad Tag button, opens new dialog
         * @param placement
         */
        $scope.getPlacementTag = function(placement){
            ngDialog.open({
                template: 'modules/publisher/views/partials/placement-tags.html',
                controller: ['$scope','PlacementTag',function($scope,PlacementTag) {
                    $scope.publisher = $scope.ngDialogData.publisher;
                    $scope.placement = $scope.ngDialogData.placement;

                    // set default tagtype based on what tag types are supported by this placement's defaultType
                    var defaultTagType = DEFAULT_TYPES[$scope.placement.defaultType].tagTypes[0];

                    // Default tag options
                    $scope.options = {
                        secure: false,
                        type: defaultTagType
                    };

                    $scope.copySuccess = function(e){
                        Notify.alert('Your ad tag has been copied to your clipboard.',{});
                    };

                    $scope.getPlacementTag = function(){
                        PlacementTag.getTag({
                            publisherId: $scope.publisher._id,
                            placementId: $scope.placement._id,
                            secure: $scope.options.secure,
                            type: $scope.options.type
                        }).then(function(response){
                            $scope.tag = response.data.tag;
                        });
                    };
                    $scope.$watchGroup(['options.secure', 'options.type'], function(){
                        $scope.getPlacementTag();
                    });
                }],
                data: {publisher: $scope.publisher, placement: placement}
            });
        };
	}
]);