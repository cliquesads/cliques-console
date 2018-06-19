/* global _, angular, moment, user, deploymentMode */
'use strict';

angular.module('publisher').controller('PageController', ['$scope','$stateParams','Publisher',
    'PUBLISHER_TOOLTIPS','OPENRTB','CREATIVE_SIZES','DEFAULT_TYPES','NATIVE_POSITIONS',
    'HourlyAdStat','aggregationDateRanges','Authentication','Notify','ngDialog',
	function($scope,$stateParams, Publisher, PUBLISHER_TOOLTIPS, OPENRTB, CREATIVE_SIZES,
             DEFAULT_TYPES, NATIVE_POSITIONS, HourlyAdStat, aggregationDateRanges, Authentication, Notify, ngDialog){
        $scope.DEFAULT_TYPES = DEFAULT_TYPES;
        $scope.authentication = Authentication;

        $scope.getPositionByCode = function(code, placement){
            if (placement.type === 'native' || placement.type === 'multiPaneNative'){
                return NATIVE_POSITIONS.filter(function(pos){ return pos.code === code; })[0];
            } else {
                return OPENRTB.positions.filter(function(pos){ return pos.code === code; })[0];
            }
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
                    if (value !== 'Success'){
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

        $scope.editNativeSpecs = function(placement){
            var initNative = placement.native;
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/publisher/views/partials/edit-native-specs.html',
                controller: 'EditNativeSpecs',
                scope: $scope,
                data: { placement: placement, publisher: $scope.publisher },
                preCloseCallback: function(value){
                    if (value !== 'Success'){
                        var placement_ind = _.findIndex($scope.page.placements, function(pl){
                            return pl._id === placement._id;
                        });
                        $scope.$apply(function(){
                            $scope.page.placements[placement_ind].native = initNative;
                        });
                        return true;
                    } else {
                        setPage();
                    }
                }
            });
        };

        $scope.editMultiPaneNativeSpecs = function(placement){
            var initMultiPaneNative = placement.multiPaneNative;
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth800',
                template: 'modules/publisher/views/partials/edit-multi-pane-native-specs.html',
                controller: 'EditMultiPaneNativeSpecs',
                scope: $scope,
                data: { placement: placement, publisher: $scope.publisher },
                preCloseCallback: function(value){
                    if (value !== 'Success'){
                        var placement_ind = _.findIndex($scope.page.placements, function(pl){
                            return pl._id === placement._id;
                        });
                        $scope.$apply(function(){
                            $scope.page.placements[placement_ind].multiPaneNative = initMultiPaneNative;
                        });
                        return true;
                    } else {
                        setPage();
                    }
                }
            });
        };

        $scope.editDefaultCondition = function(placement){
            if (placement.type !== 'native' && placement.type !== 'multiPaneNative'){
                var initDefaultType = placement.defaultType;
                var initPassbackTag = placement.passbackTag;
                var initHostedCreatives = placement.hostedCreatives;
                ngDialog.open({
                    className: 'ngdialog-theme-default dialogwidth800',
                    template: 'modules/publisher/views/partials/edit-default-condition.html',
                    controller: 'DefaultConditionController',
                    scope: $scope,
                    data: { placement: placement },
                    preCloseCallback: function(value){
                        if (value !== 'Success'){
                            var placement_ind = _.findIndex($scope.page.placements, function(pl){
                                return pl._id === placement._id;
                            });
                            $scope.$apply(function(){
                                $scope.page.placements[placement_ind].defaultType = initDefaultType;
                                $scope.page.placements[placement_ind].passbackTag = initPassbackTag;
                                $scope.page.placements[placement_ind].hostedCreatives = initHostedCreatives;
                            });
                            return true;
                        } else {
                            setPage();
                        }
                    }
                });
            }
        };

        // get deployment mode from global var
        $scope.deploymentMode = deploymentMode;

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
                    $scope.deploymentMode = deploymentMode;

                    // set default tagtype based on what tag types are supported by this placement's defaultType
                    var defaultTagType = DEFAULT_TYPES[$scope.placement.defaultType].tagTypes[0];

                    // Default tag options
                    $scope.options = {
                        dynamicInsertion: false,
                        secure: false,
                        type: defaultTagType,
                        targetId: null,

                        // TODO: resolve deploymentMode differences
                        // this option sets whether JS tag is in standard format, or async "factory"
                        // format
                        useFactory: $scope.deploymentMode === 'contentNetwork',
                        locationId: $scope.deploymentMode === 'contentNetwork',
                        targetChildIndex: null,
                        externalTest: false,
                        keywords: null
                    };

                    $scope.copySuccess = function(e){
                        Notify.alert('Your ad tag has been copied to your clipboard.',{});
                    };

                    $scope.getPlacementTag = function(){
                        PlacementTag.getTag({
                            publisherId: $scope.publisher._id,
                            placementId: $scope.placement._id,
                            secure: $scope.options.secure,
                            type: $scope.options.type,
                            targetId: $scope.options.targetId,
                            keywords: $scope.options.keywords,
                            locationId: $scope.options.locationId,
                            useFactory: $scope.options.useFactory,
                            externalTest: $scope.options.externalTest,
                            targetChildIndex: $scope.options.targetChildIndex
                        }).then(function(response){
                            $scope.tag = response.data.tag;
                        });
                    };
                    $scope.$watchGroup(['options.secure', 'options.type', 'options.targetId', 'options.targetChildIndex',
                            'options.keywords', 'options.locationId','options.externalTest'],
                        function(){
                            $scope.getPlacementTag();
                        });
                }],
                data: {publisher: $scope.publisher, placement: placement}
            });
        };

        /**
         * Start to edit page form, also show existed keywords in tagsinput
         */
        $scope.existedKeywords = [];
        $scope.editPageForm = function() {
            $scope.existedKeywords = angular.copy($scope.page.keywords);
            var tagsinputDOM = angular.element(document.getElementById('keywords-tagsinput'));
            $scope.page.keywords.forEach(function(keyword) {
                tagsinputDOM.tagsinput('add', keyword);
            });
            $scope.pageForm.$show();
            $scope.isEditingPageForm = true;

            // respond to itemAdded/itemRemoved event and 
            // update the value of $scope.page.keywords
            tagsinputDOM.on('itemAdded itemRemoved', function() {
                $scope.page.keywords = $scope.existedKeywords;
            });
        };
	}
]);