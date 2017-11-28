/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('newPageController', ['$scope','PUBLISHER_TOOLTIPS','Authentication','Notify',
    function($scope,PUBLISHER_TOOLTIPS, Authentication, Notify){
        $scope.authentication = Authentication;
        $scope.publisher = $scope.ngDialogData.publisher;

        function setPage(){

            // Set refs to nested documents in parent Publisher so $update method
            // can be used.  Don't know if this is entirely necessary but doing
            // to be safe, as I find Angular's handling of object refs kind of confusing
            var site_ind = _.findIndex($scope.publisher.sites, function(site){
                return site._id === $scope.ngDialogData.site._id;
            });
            $scope.site = $scope.publisher.sites[site_ind];

            var page_ind = _.findIndex($scope.site.pages, function(page){
                return page._id === $scope.ngDialogData.page._id;
            });
            $scope.page = $scope.site.pages[page_ind];
            //$scope.page = $scope.ngDialogData.page;
        }
        setPage();

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

        $scope.updateAndClose = function(){
            var valid = $('#placementForm').parsley().validate() && $('#pageForm').parsley().validate();
            if (valid){
                this.page.placements.forEach(function(placement){
                    if (!placement.w && !placement.h){
                        switch (placement.type){
                            case "native":
                                placement.defaultType = 'hide';
                                placement.native = {};
                                placement.w = 1;
                                placement.h = 1;
                                break;
                            case "multiPaneNative":
                                placement.defaultType = 'hide';
                                placement.multiPaneNative = { pane: { desktop: {}, mobile: {}}, wrapper: {}};
                                placement.w = 1;
                                placement.h = 1;
                                break;
                            default:
                                var dims = placement.dimensions.split('x');
                                placement.w = Number(dims[0]);
                                placement.h = Number(dims[1]);
                        }
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
