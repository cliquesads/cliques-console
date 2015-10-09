'use strict';

angular.module('advertiser').controller('AdvertiserWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    'Authentication',
    'Advertiser',
    'getCliqueTree',
    'getSitesInCliqueTree',
    'DMA',
    'FileUploader',
    'AdvertiserUtils',
    'BID_SETTINGS',
    'ADVERTISER_TOOLTIPS',
    'LOGO',
	function($scope, $stateParams, $location, $q, Authentication, Advertiser, getCliqueTree, getSitesInCliqueTree, DMA, FileUploader, AdvertiserUtils, BID_SETTINGS, ADVERTISER_TOOLTIPS, LOGO) {

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
            getSitesInCliqueTree(branch.label).then(function(response){
                $scope.sites = response.data;
            });
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
            logo_url: LOGO.default_secure_url,
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
        var logo_uploader = $scope.logo_uploader = new FileUploader({
            url: 'logos'
        });

        var creative_uploader = $scope.creative_uploader = new FileUploader({
            url: 'creativeassets'
        });
        $scope.creative_uploader.onCompleteAll = function(){
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
                creative_uploader.uploadAll();
            }
        };

        $scope.onDCMUpload = function(creatives){
            $scope.dcm_creatives = creatives;
            $scope.uploads_completed = true;
        };

        /**
         * Method called to submit Advertiser to API
         * @returns {boolean}
         */
        $scope.createAdvertiser = function() {
            //// this is stupid, but check to see if only error is empty doubleClickForm
            //// Can't figure out a way to elegantly ignore it when validating outer form
            //var doubleClickFormErrorOnly = false;
            //if (this.advertiserForm.$error){
            //    if (this.advertiserForm.$error.required){
            //        if (this.advertiserForm.$error.required.length === 0){
            //            if (this.advertiserForm.$error.required[0].$name === 'doubleClickForm'){
            //                doubleClickFormErrorOnly = true;
            //            }
            //        }
            //    }
            //}
            //
            //if (this.advertiserForm.$valid || doubleClickFormErrorOnly) {
            $scope.loading = true;
            // Construct advertiser JSON to POST to API
            var creatives = AdvertiserUtils.getCreativesFromUploadQueue(creative_uploader);

            // also get creatives from DCM Queue
            if ($scope.dcm_creatives){
                creatives = creatives.concat($scope.dcm_creatives);
            }

            var creativegroups = AdvertiserUtils.groupCreatives(creatives, $scope.campaign.name);
            // now create new advertiser object
            var campaign = this.campaign;

            // convert target arrays to weightedSchema format
            campaign = AdvertiserUtils.convertAllTargetArrays(campaign);

            campaign.creativegroups = creativegroups;
            var advertiser = new Advertiser({
                name:           this.advertiser.name,
                description:    this.advertiser.description,
                website:        this.advertiser.website,
                logo_url:       this.advertiser.logo_url,
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
                $scope.dcm_creatives = '';
                //On success, redirect to advertiser detail page
                var advertiserId = response._id;
                $location.url('/advertiser/' + advertiserId);
            }, function (errorResponse) {
                $scope.loading = false;
                $scope.creation_error = errorResponse.data.message;
            });
        };
	}
]);