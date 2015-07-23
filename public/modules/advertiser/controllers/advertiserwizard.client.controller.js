'use strict';

angular.module('advertiser').controller('AdvertiserWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    'Authentication',
    'Advertiser',
    'DatepickerService',
    'getCliqueTree',
    'DMA',
    'FileUploader',
	function($scope, $stateParams, $location, $q, Authentication, Advertiser, DatepickerService, getCliqueTree, DMA, FileUploader) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

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
            url: 'creativeassets/test/test'
        });

        //##### FILTERS ######
        uploader.filters.push({
            name: 'mimetypeFilter',
            fn: function(item, options) {
                var mimetypes = ['image/jpeg','image/gif', 'image/png'];
                return mimetypes.indexOf(item.type) > -1
            }
        });

        uploader.filters.push({
            name: 'sizeFilter',
            fn: function(item, options) {
                var max_size = 60 * 1024;
                return item.size < max_size;
            }
        });

        //##### CALLBACKS ######
        $scope.creative_upload_errors = [];
        uploader.onWhenAddingFileFailed = function(item, filter, options) {
            if (filter.name === 'mimetypeFilter'){
                $scope.creative_upload_error = 'File must be JPG, PNG or GIF';
            } else if (filter.name === 'sizeFilter') {
                $scope.creative_upload_error = 'File must be less than 60 KB';
            }
        };

        $scope.SUPPORTED_DIMENSIONS = ['300x250','300x600','160x600','728x90','320x50','468x460','120x600','300x100'];

        uploader.onAfterAddingFile = function(fileItem) {
            // check added image dimensions, and remove item from queue if
            // dimensions not supported
            var reader = new FileReader();
            var image = new Image();
            // Have to use onload callbacks for both FileReader & Image objects,
            // then load data to each
            reader.onload = function(_file){
                image.onload = function(){
                    var self = this;
                    // Have to wrap asynchronous scope changes in $apply call
                    // in order to update bindings properly, otherwise
                    // browser will execute callback after next event tick
                    $scope.$apply(function(){
                        // Store width & height properties on file object for convenience
                        var dimensions = [self.width, self.height].join('x');
                        fileItem.width = self.width;
                        fileItem.height = self.height;
                        fileItem.dimensions = dimensions;
                        // Now check to make sure dimensions are supported, calling callback
                        // if they're not.
                        if ($scope.SUPPORTED_DIMENSIONS.indexOf(dimensions) === -1){
                            $scope.creative_upload_error = 'File dimensions not supported. Image dimensions must be one of the following: ' + $scope.SUPPORTED_DIMENSIONS.join(', ');
                            fileItem.remove();
                        }
                    });
                };
                // now set image source
                image.src = _file.target.result;
            };
            // load file
            reader.readAsDataURL(fileItem._file);
        };

        uploader.onAfterAddingAll = function(addedFileItems) {
            if ($scope.creative_upload_error){
                $scope.creative_upload_error = null;
            }
            //console.info('onAfterAddingAll', addedFileItems);
        };
        uploader.onBeforeUploadItem = function(item) {
            //console.info('onBeforeUploadItem', item);
        };
        uploader.onProgressItem = function(fileItem, progress) {
            //console.info('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function(progress) {
            //console.info('onProgressAll', progress);
        };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
            //console.info('onSuccessItem', fileItem, response, status, headers);
        };
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            //console.info('onErrorItem', fileItem, response, status, headers);
        };
        uploader.onCancelItem = function(fileItem, response, status, headers) {
            //console.info('onCancelItem', fileItem, response, status, headers);
        };
        uploader.onCompleteItem = function(fileItem, response, status, headers) {
            // Add Google Cloud URL to fileitem when it successfully uploads
            fileItem.url = response.url;
        };
        uploader.onCompleteAll = function(){
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
         * Method called to submit Advertiser to API
         * @param callback
         * @returns {boolean}
         */
        $scope.create = function() {
            if (this.advertiserForm.$valid) {
                $scope.loading = true;
                // Construct advertiser JSON to POST to API
                var creatives = getCreativesFromUploadQueue();
                var creativegroups = groupCreatives(creatives, $scope.campaign.name);
                // now create new advertiser object
                var campaign = this.campaign;
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