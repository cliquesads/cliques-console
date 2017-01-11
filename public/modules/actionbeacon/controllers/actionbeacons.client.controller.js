/* global _, angular, moment, user */
'use strict';

angular.module('actionbeacon').controller('ActionBeaconController', [
    '$scope',
    '$location',
    'ngDialog',
    'Advertiser',
    'ActionBeacon',
    '$rootScope',
    function($scope, $location, ngDialog, Advertiser, ActionBeacon, $rootScope) {
        console.log($location.$$path);
        if ($location.$$path === '/actionbeacon') {
            if (!$rootScope.advertiser) {
                $scope.advertisers = Advertiser.query(function(advertisers) {
                    if (advertisers.length === 1) {
                        $scope.advertiser = advertisers[0];
                        $rootScope.advertiser = advertisers[0];
                    } else {
                        // either user has NOT selected an advertiser yet, or user doesn't have an advertiser, either way, redirect to list advertiser page
                        $location.path('/advertiser');
                    }
                });
            }
        }

        $scope.actionbeacon = {
            name: null
        };

        $scope.update = function(callback) {
            this.advertiser.$update(function() {
                if (callback) {
                    callback();
                }
            }, function(errorResponse) {
                $scope.saveerror = errorResponse.data.message;
            });
        };

        $scope.showActionBeaconTagDialog = function(actionbeacon) {
            ngDialog.open({
                template: 'modules/actionbeacon/views/partials/get-actionbeacon-code.html',
                controller: ['$scope', 'ActionBeacon', function($scope, ActionBeacon) {
                    $scope.advertiser = $scope.ngDialogData.advertiser;
                    $scope.actionbeacon = $scope.ngDialogData.actionbeacon;
                    $scope.options = {
                        secure: false
                    };
                    $scope.getTag = function() {
                        ActionBeacon.getTag({
                            advertiserId: $scope.advertiser._id,
                            actionbeaconId: actionbeacon._id,
                            secure: $scope.options.secure
                        }).then(function(response) {
                            $scope.tag = response.data.tag;
                        });
                    };

                    $scope.getTag();

                    $scope.toggleSecureOption = function() {
                    	$scope.getTag();
                    };
                }],
                data: {
                    advertiser: $scope.advertiser,
                    actionbeacon: actionbeacon
                }
            });
        };
        $scope.showDeleteActionBeaconDialog = function(actionbeacon) {
            ngDialog.open({
                template: 'modules/actionbeacon/views/partials/delete-actionbeacon.html',
                controller: ['$scope', function($scope) {
                    $scope.advertiser = $scope.ngDialogData.advertiser;
                    $scope.update = function() {
                        var advertiser = $scope.advertiser;
                        advertiser.$update(function() {}, function(errorResponse) {
                            $scope.error = errorResponse.data.message;
                        });
                    };
                    $scope.confirm = function(val) {
                        if (val === 1) {
                            // first find indices of desired creative
                            var ab_ind = _.findIndex($scope.advertiser.actionbeacons, function(ab) {
                                return ab === actionbeacon;
                            });
                            // remove from actionbeacons document array
                            $scope.advertiser.actionbeacons.splice(ab_ind, 1);
                            $scope.update();
                        }
                    };
                }],
                data: { advertiser: $scope.advertiser }
            });
        };
        $scope.showCreateNewActionBeaconDialog = function() {
            ngDialog.open({
                template: 'modules/actionbeacon/views/partials/new-actionbeacon.html',
                controller: ['$scope', function($scope) {
                    $scope.advertiser = $scope.ngDialogData.advertiser;
                    $scope.submitNewActionBeacon = function(e, newActionBeaconName) {
                        e.preventDefault();
                        if (this.newActionBeacon.$valid) {
                            this.advertiser.actionbeacons.push(this.actionbeacon);
                            this.advertiser.$update(function() {
                                $scope.closeThisDialog(0);
                            }, function(errorResponse) {
                                $scope.saveerror = errorResponse.data.message;
                            });
                        } else {
                            $scope.closeThisDialog(0);
                            return false;
                        }
                    };
                }],
                data: { advertiser: $scope.advertiser }
            });
        };
    }
]);
