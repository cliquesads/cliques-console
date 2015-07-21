'use strict';

angular.module('advertiser').controller('AdvertiserWizardController', ['$scope',
    '$stateParams',
    '$location',
    'Authentication',
    'Advertiser',
    'DatepickerService',
    'getCliqueTree',
    'DMA',
    'FileUploader',
	function($scope, $stateParams, $location, Authentication, Advertiser, DatepickerService, getCliqueTree, DMA, FileUploader) {
		$scope.authentication = Authentication;
        $scope.calendar = DatepickerService;
        $scope.Math = Math;

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
            start_date:     null,
            end_date:       null,
            base_bid:       null,
            max_bid:        null,
            frequency:      null,
            clique:         null,
            dma_targets:    null,
            placement_targets: null,
            creativegroups: []
        };
        $scope.creatives = [{
            name: null,
            type: 'Banner',
            h: null,
            w: null,
            url: null,
            click_url: null,
            weight: null
        }];

		$scope.create = function() {
            $scope.submitted = true;
            if (this.advertiserForm.$valid) {
                // group creatives by size and create creative groups for each
                var creativegroups_obj = {};
                $scope.creatives.forEach(function(creative){
                    var key = creative.w + 'x' + creative.h;
                    if (creativegroups_obj.hasOwnProperty(key)){
                        creativegroups_obj[key] = [creative];
                    } else {
                        creativegroups_obj[key].push(creative);
                    }
                });
                var creativegroups = [];
                for (var size in creativegroups_obj){
                    if (creativegroups_obj.hasOwnProperty(size)){
                        creativegroups.push({
                            name: $scope.campaign.name + '_' + size,
                            h: Number(size.split('x')[1]),
                            w: Number(size.split('x')[0]),
                            creatives: [creativegroups_obj[size]]
                        });
                    }
                }
                // now create new advertiser object
                var advertiser = new Advertiser({
                    name:           this.name,
                    description:    this.description,
                    website:        this.website,
                    cliques:        this.cliques,
                    campaigns: [{
                        name:           this.campaign.name,
                        description:    this.campaign.description,
                        start_date:     this.campaign.start_date,
                        end_date:       this.campaign.end_date,
                        base_bid:       this.campaign.base_bid,
                        max_bid:        this.campaign.max_bid,
                        frequency:      this.campaign.frequency,
                        clique:         this.campaign.clique,
                        creativegroups: [creativegroups]
                    }],
                    actionbeacons: this.actionbeacons
                });
                advertiser.$create(function (response) {
                    $location.path('advertiser/');
                    $scope.name = '';
                    $scope.description= '';
                    $scope.campaign = '';
                    $scope.creatives = '';
                    $scope.cliques = '';
                    $scope.website = '';
                    $scope.actionbeacons = '';
                }, function (errorResponse) {
                    $scope.error = errorResponse.data.message;
                });
            } else {
                return false;
            }
		};

        $scope.validateInput = function(name, type) {
            var input = this.advertiserForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };


        //#################################
        //######### FILE UPLOADER #########
        //#################################

        var uploader = $scope.uploader = new FileUploader({
            url: 'creativeassets'
        });

        // FILTERS
        uploader.filters.push({
            name: 'customFilter',
            fn: function(item /*{File|FileLikeObject}*/, options) {
                return this.queue.length < 10;
            }
        });

        // CALLBACKS

        uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
            console.info('onWhenAddingFileFailed', item, filter, options);
        };
        uploader.onAfterAddingFile = function(fileItem) {
            console.info('onAfterAddingFile', fileItem);
        };
        uploader.onAfterAddingAll = function(addedFileItems) {
            console.info('onAfterAddingAll', addedFileItems);
        };
        uploader.onBeforeUploadItem = function(item) {
            console.info('onBeforeUploadItem', item);
        };
        uploader.onProgressItem = function(fileItem, progress) {
            console.info('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function(progress) {
            console.info('onProgressAll', progress);
        };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
            console.info('onSuccessItem', fileItem, response, status, headers);
        };
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            console.info('onErrorItem', fileItem, response, status, headers);
        };
        uploader.onCancelItem = function(fileItem, response, status, headers) {
            console.info('onCancelItem', fileItem, response, status, headers);
        };
        uploader.onCompleteItem = function(fileItem, response, status, headers) {
            console.info('onCompleteItem', fileItem, response, status, headers);
        };
        uploader.onCompleteAll = function() {
            console.info('onCompleteAll');
        };

        console.info('uploader', uploader);
	}
]);