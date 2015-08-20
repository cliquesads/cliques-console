'use strict';

angular.module('advertiser').controller('CampaignWizardController', ['$scope',
    '$stateParams',
    '$location',
    'Authentication',
    'Advertiser',
    'getCliqueTree',
    'DMA',
    'FileUploader',
	function($scope, $stateParams, $location, Authentication, Advertiser, getCliqueTree, DMA, FileUploader) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

        $scope.authentication = Authentication;

        // Populate tree data for tree visualization
        $scope.cliques = [];
        getCliqueTree($scope);
        $scope.set_clique = function(branch) {
            $scope.campaign.clique = branch.label;
        };
        var tree;
        // This is our API control variable
        $scope.my_tree = tree = {};

        $scope.dmas = DMA.query();

        // Set mins & maxes
        $scope.min_base_bid = 1;
        $scope.max_base_bid = 20;

        $scope.campaign = {
            name:           null,
            description:    null,
            budget:         null,
            start_date:     null,
            end_date:       null,
            base_bid:       null,
            max_bid:        null,
            frequency:      null,
            clique:         null,
            dma_targets:    null,
            placement_targets: null
        };

        //#################################//
        //######### FILE UPLOADER #########//
        //#################################//

        var uploader = $scope.uploader = new FileUploader({
            url: 'creativeassets'
        });
        $scope.uploader.onCompleteAll = function(){
            $scope.uploads_completed = true;
        };
        /**
        * Wrapper for uploader.uploadAll() which allows form to pass
        * validation function to call first.
        *
        * @param validateFunc
        */
        $scope.validateAndUpload = function(validateFunc){
            // pre_callback should be validation step for other various
            // form elements, and return true if validation passes
            if (validateFunc){
                uploader.uploadAll();
            }
        };

        //####################################//
        //###### CREATE/SUBMIT METHODS #######//
        //####################################//
        /**
         * Maps successfully uploaded items in uploader queue to array of
         * creative objects to push to API
         * @returns {Array}
         */
        var getCreativesFromUploadQueue = function(){
            var creatives = [];
            uploader.queue.forEach(function(fileItem){
                if (fileItem.isSuccess) {
                    creatives.push({
                        name: fileItem.file.name,
                        click_url: fileItem.click_url,
                        w: fileItem.width,
                        h: fileItem.height,
                        url: fileItem.url
                    });
                }
            });
            return creatives;
        };

        /**
         * Helper function to group creatives by size and create creative groups for each
         * @param creatives
         * @param groupname_prefix
         * @returns {Array}
         */
        var groupCreatives = function(creatives, groupname_prefix){
            var creativegroups_obj = {};
            creatives.forEach(function(creative){
                var key = creative.w + 'x' + creative.h;
                if (creativegroups_obj.hasOwnProperty(key)){
                    creativegroups_obj[key].push(creative);
                } else {
                    creativegroups_obj[key] = [creative];
                }
            });
            var creativegroups = [];
            for (var size in creativegroups_obj){
                if (creativegroups_obj.hasOwnProperty(size)){
                    creativegroups.push({
                        name: groupname_prefix + '_' + size,
                        h: Number(size.split('x')[1]),
                        w: Number(size.split('x')[0]),
                        creatives: creativegroups_obj[size]
                    });
                }
            }
            return creativegroups
        };

        /**
         * Converts array of weighted targets with whole target object in each element
         * to array of objects that conform with respective weightedTargetSchema
         * @param arr
         */
        var convertWeightedTargetArray = function(arr){
            if (arr === null) return arr;
            var new_target_arr = [];
            arr.forEach(function(obj){
                new_target_arr.push({
                    target: obj._id,
                    weight: obj.weight
                });
            });
            return new_target_arr;
        };

        /**
         * Method called to submit Advertiser to API
         * @returns {boolean}
         */
        $scope.create = function() {
            if (this.campaignForm.$valid) {
                $scope.loading = true;
                // Construct advertiser JSON to POST to API
                var creatives = getCreativesFromUploadQueue();
                var creativegroups = groupCreatives(creatives, $scope.campaign.name);
                // now create new advertiser object
                var campaign = this.campaign;

                // convert target arrays to weightedSchema format
                for (var prop in campaign){
                    if (campaign.hasOwnProperty(prop)){
                        // TODO: sort of a hack
                        if (prop.indexOf('_targets') > -1){
                            campaign[prop] = convertWeightedTargetArray(campaign[prop]);
                        }
                    }
                }
                campaign.creativegroups = creativegroups;
                var advertiser = $scope.ngDialogData.advertiser;
                advertiser.campaigns.push(campaign);
                advertiser.$update(function(){
                    $scope.closeThisDialog('Success');
                }, function (errorResponse){
                    $scope.loading = false;
                    $scope.creation_error = errorResponse.data.message;
                });
            } else {
                return false;
            }
        };

        $scope.validateInput = function(name, type) {
            var input = this.advertiserForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };
	}
]);