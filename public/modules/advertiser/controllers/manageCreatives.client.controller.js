/* global _, angular, moment */
'use strict';

angular.module('advertiser').controller('manageCreativesController', [
    '$scope',
    'campaign',
    'AdvertiserUtils',
    'FileUploader',
    'ngDialog',
    'Notify',
    'NATIVE_SPECS',
    function($scope, campaign,AdvertiserUtils,FileUploader,ngDialog, Notify, NATIVE_SPECS){
        // Set form hidden by default

        $scope.dirty = false;
        $scope.NATIVE_SPECS = NATIVE_SPECS;
        $scope.onCreativeWeightChange = function(id){
            var ids = id.split(',');
            var crgid = ids[0];
            var cid = ids[1];
            var creativeGroup = _.find($scope.campaign.creativegroups, function(c){ return c._id === crgid; });
            var creative = _.find(creativeGroup.creatives, function(c){ return c._id === cid; });
            creative.dirty = true;
        };

        /**
         * Get Campaigns from URL state params on load
         */
        $scope.advertiser = campaign.advertiser;
        $scope.campaignIndex = campaign.index;
        $scope.campaign = campaign.campaign;

        $scope.initCreativeWeights = function(){
            $scope.creativeWeights = {};
            $scope.campaign.creativegroups.forEach(function(crg){
               crg.creatives.forEach(function(cr){
                   $scope.creativeWeights[cr._id] = cr.weight;
               });
            });
        };
        $scope.initCreativeWeights();

        $scope.creativePreview = function(creative){
            var dialogClass = 'dialogwidth800';
            if (creative.w >= 800) {
                dialogClass = 'dialogwidth1000';
            }
            ngDialog.open({
                className: 'ngdialog-theme-default ' + dialogClass,
                template: 'modules/advertiser/views/partials/creative-preview.html',
                controller: 'creativePreviewController',
                data: {creative: creative, advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
        };

        // almost trivial wrapper for scope.advertiser.$update that just ensures campaign
        // is reset properly in scope when advertiser is updated, and sets scope.saveerror if error
        // is thrown.
        $scope.update = function(success, error){
            this.advertiser.$update(function(response){
                $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                $scope.initCreativeWeights();
                if (success) success(response);
            },function(errorResponse){
                if (error) error(errorResponse);
                $scope.saveerror = errorResponse.data.message;
            });
        };

        $scope.updateCreative = function(creative){
            $scope.update(function(response){
                creative.dirty = false;
            }, function(errorResponse){
                creative.dirty = false;
                creative.weight = $scope.creativeWeights[creative._id];
            });
        };

        $scope.remove = function(creativegroup, creative){
            ngDialog.openConfirm({
                template:'\
                            <p>Are you sure you want to delete this creative? This cannot be undone.</p>\
                            <div class="ngdialog-buttons">\
                                <button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog(0)">No</button>\
                                <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Yes</button>\
                        </div>',
                plain: true
            }).then(function(val){
                if (val === 1){
                    var removedCreative;
                    var removedCreativeGroup;
                    // first find indices of desired creative
                    var crg_ind = _.findIndex($scope.campaign.creativegroups, function(crg) { return crg === creativegroup; });
                    var cr_ind = _.findIndex($scope.campaign.creativegroups[crg_ind].creatives, function(cr) { return cr === creative; });
                    // remove from creatives document array
                    removedCreative = $scope.campaign.creativegroups[crg_ind].creatives.splice(cr_ind, 1);
                    //remove creative group if it doesn't contain any creatives anymore
                    if ($scope.campaign.creativegroups[crg_ind].creatives.length === 0){
                        removedCreativeGroup = $scope.campaign.creativegroups.splice(crg_ind, 1);
                    }
                    $scope.update(function(response){},
                    function(errorResponse){
                        // add back in if
                        if (removedCreativeGroup){
                            $scope.campaign.creativegroups.splice(crg_ind, 0, removedCreativeGroup[0]);
                        }
                        $scope.campaign.creativegroups[crg_ind].creatives.splice(cr_ind, 0, removedCreative[0]);
                    });
                }
            });
        };

        $scope.addNewCreatives = function(){
            ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth1000',
                template: 'modules/advertiser/views/partials/upload-creatives.html',
                controller: 'uploadCreativesController',
                data: {advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
        };
}]);
