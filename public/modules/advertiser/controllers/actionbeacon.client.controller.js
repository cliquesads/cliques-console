/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('actionBeaconController', [
    '$scope',
    'editableOptions',
    'editableThemes',
    'Advertiser',
    'AdvertiserUtils',
    'ngDialog',
    function($scope, editableOptions, editableThemes, Advertiser, AdvertiserUtils, ngDialog) {
        editableOptions.theme = 'bs3';
        editableThemes.bs3.inputClass = 'input-sm';
        editableThemes.bs3.buttonsClass = 'btn-sm';
        editableThemes.bs3.submitTpl = '<button type="button" ng-click="$form.$submit()" class="btn btn-success"><span class="fa fa-check"></span></button>';
        editableThemes.bs3.cancelTpl = '<button type="button" class="btn btn-default" ng-click="$form.$cancel()">'+
                                        '<span class="fa fa-times text-muted"></span>'+
                                        '</button>';

        $scope.advertiser = $scope.ngDialogData.advertiser;

        $scope.update = function(){
            this.advertiser.$update(function(){
            },function(errorResponse){
                $scope.saveerror = errorResponse.data.message;
            });
        };

        $scope.getTag = function(actionbeacon){
            ngDialog.open({
                template: '\
                    <section data-ng-init="getTag()">\
                        <h4>Code for {{actionbeacon.name}}</h4>\
                        <div class="checkbox c-checkbox">\
                            <label><input type="checkbox" ng-model="options.secure"/><span class="fa fa-check"></span>Secure</label>\
                        </div>\
                        <pre>{{ tag }}</pre>\
                    </section>',
                plain: true,
                controller: ['$scope','$http', 'ActionBeacon',function($scope,$http,ActionBeacon) {
                    $scope.advertiser = $scope.ngDialogData.advertiser;
                    $scope.actionbeacon = $scope.ngDialogData.actionbeacon;
                    $scope.options = {
                        secure: false
                    };
                    $scope.getTag = function(){
                        ActionBeacon.getTag({
                            advertiserId: $scope.advertiser._id,
                            actionbeaconId: $scope.actionbeacon._id,
                            secure: $scope.options.secure
                        }).then(function(response){
                            $scope.tag = response.data.tag;
                        });
                    };
                    $scope.$watch(function(scope){ return scope.options.secure }, function(){
                        $scope.getTag();
                    });
                }],
                data: {advertiser: $scope.advertiser, actionbeacon: actionbeacon }
            });
        };

        $scope.remove = function(actionbeacon){
            ngDialog.openConfirm({
                template:'\
                            <p>Are you sure you want to delete this Action Beacon? This cannot be undone.</p>\
                            <div class="ngdialog-buttons">\
                                <button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog(0)">No</button>\
                                <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Yes</button>\
                        </div>',
                plain: true
            }).then(function(val){
                if (val === 1){
                    // first find indices of desired creative
                    var ab_ind = _.findIndex($scope.advertiser.actionbeacons, function(ab) { return ab === actionbeacon; });
                    // remove from actionbeacons document array
                    $scope.advertiser.actionbeacons.splice(ab_ind,1);
                    $scope.update();
                }
            });
        };
    }
]);