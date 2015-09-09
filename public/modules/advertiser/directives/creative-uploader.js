/**
 * Created by bliang on 8/15/15.
 */
angular.module('advertiser').directive('creativeUploader', [
    'CREATIVE_SIZES',
    'MAX_CREATIVE_SIZE_KB',
    function(CREATIVE_SIZES, MAX_CREATIVE_SIZE_KB){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                onuploadall: '&',
                wizardstep: '@',
                width: '@',
                uploader: '='
            },
            templateUrl: 'modules/advertiser/views/partials/creative-uploader.html',
            link: function(scope, element, attrs){
                //##### FILTERS ######
                scope.uploader.filters.push({
                    name: 'mimetypeFilter',
                    fn: function(item, options) {
                        var mimetypes = ['image/jpeg','image/gif', 'image/png'];
                        return mimetypes.indexOf(item.type) > -1;
                    }
                });

                scope.uploader.filters.push({
                    name: 'sizeFilter',
                    fn: function(item, options) {
                        var max_size = MAX_CREATIVE_SIZE_KB * 1024;
                        return item.size < max_size;
                    }
                });

                //##### CALLBACKS ######
                scope.creative_upload_errors = [];
                scope.uploader.onWhenAddingFileFailed = function(item, filter, options) {
                    if (filter.name === 'mimetypeFilter'){
                        scope.creative_upload_error = 'File must be JPG, PNG or GIF';
                    } else if (filter.name === 'sizeFilter'){
                        scope.creative_upload_error = 'File must be less than 60 KB';
                    }
                };

                scope.SUPPORTED_DIMENSIONS = CREATIVE_SIZES.supported_dimensions;

                scope.uploader.onAfterAddingFile = function(fileItem) {
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
                            scope.$apply(function(){
                                // Store width & height properties on file object for convenience
                                var dimensions = [self.width, self.height].join('x');
                                var non_retina = scope.SUPPORTED_DIMENSIONS.indexOf(dimensions) > -1;
                                // For retina support
                                var universal_dimensions = [self.width/2, self.height/2].join('x');
                                var retina = scope.SUPPORTED_DIMENSIONS.indexOf(universal_dimensions) > -1;

                                //This will technically cause a problem if any of the supported
                                //dimensions are 2x multiples/quotient of each other
                                if (retina){
                                    fileItem.width = self.width / 2;
                                    fileItem.height = self.height / 2;
                                    fileItem.dimensions = universal_dimensions;
                                } else {
                                    fileItem.width = self.width;
                                    fileItem.height = self.height;
                                    fileItem.dimensions = dimensions;
                                }

                                // Now check to make sure dimensions are supported, calling callback
                                // if they're not.
                                if (!non_retina && !retina){
                                    scope.creative_upload_error = 'File dimensions not supported. Image dimensions must be one of the following (or retina-2x equivalent): ' + scope.SUPPORTED_DIMENSIONS.join(', ');
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

                scope.uploader.onAfterAddingAll = function(addedFileItems) {
                    if (scope.creative_upload_error){
                        scope.creative_upload_error = null;
                    }
                    //console.info('onAfterAddingAll', addedFileItems);
                };
                scope.uploader.onBeforeUploadItem = function(item) {
                    //console.info('onBeforeUploadItem', item);
                };
                scope.uploader.onProgressItem = function(fileItem, progress) {
                    //console.info('onProgressItem', fileItem, progress);
                };
                scope.uploader.onProgressAll = function(progress) {
                    //console.info('onProgressAll', progress);
                };
                scope.uploader.onSuccessItem = function(fileItem, response, status, headers) {
                    //console.info('onSuccessItem', fileItem, response, status, headers);
                };
                scope.uploader.onErrorItem = function(fileItem, response, status, headers) {
                    //console.info('onErrorItem', fileItem, response, status, headers);
                };
                scope.uploader.onCancelItem = function(fileItem, response, status, headers) {
                    //console.info('onCancelItem', fileItem, response, status, headers);
                };
                scope.uploader.onCompleteItem = function(fileItem, response, status, headers) {
                    // Add Google Cloud URL to fileitem when it successfully uploads
                    fileItem.url = response.url;
                };
            }
        };
    }
]);
