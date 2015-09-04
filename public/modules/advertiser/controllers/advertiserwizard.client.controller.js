'use strict';

angular.module('advertiser').controller('AdvertiserWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    'Authentication',
    'Advertiser',
    'getCliqueTree',
    'DMA',
    'FileUploader',
    'AdvertiserUtils',
    'BID_SETTINGS',
    'ADVERTISER_TOOLTIPS',
	function($scope, $stateParams, $location, $q, Authentication, Advertiser, getCliqueTree, DMA, FileUploader, AdvertiserUtils, BID_SETTINGS, ADVERTISER_TOOLTIPS) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

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
        $scope.min_base_bid = BID_SETTINGS.min_base_bid;
        $scope.max_base_bid = BID_SETTINGS.max_base_bid;

        // Basic models
        $scope.advertiser = {
            name: null,
            description: null,
            website: null,
            cliques: null,
            campaigns: []
        };
        $scope.campaign = {
            name:           null,
            description:    null,
            budget:         null,
            start_date:     null,
            end_date:       null,
            base_bid:       null,
            max_bid:        null,
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

        /**
         * Method called to submit Advertiser to API
         * @returns {boolean}
         */
        $scope.createAdvertiser = function() {
            if (this.advertiserForm.$valid) {
                $scope.loading = true;
                // Construct advertiser JSON to POST to API
                var creatives = AdvertiserUtils.getCreativesFromUploadQueue(uploader);
                var creativegroups = AdvertiserUtils.groupCreatives(creatives, $scope.campaign.name);
                // now create new advertiser object
                var campaign = this.campaign;

                // convert target arrays to weightedSchema format
                campaign = AdvertiserUtils.convertAllTargetArrays(campaign);

                campaign.creativegroups = creativegroups;
                var advertiser = new Advertiser({
                    name:           this.name,
                    description:    this.description,
                    website:        this.website,
                    campaigns: [campaign]
                });
                advertiser.$create(function(response){
                    $scope.loading = false;
                    $scope.name = '';
                    $scope.description= '';
                    $scope.campaign = '';
                    $scope.creatives = '';
                    $scope.cliques = '';
                    $scope.website = '';
                    //On success, redirect to advertiser detail page
                    var advertiserId = response._id;
                    $location.url('/advertiser/' + advertiserId);
                }, function (errorResponse) {
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