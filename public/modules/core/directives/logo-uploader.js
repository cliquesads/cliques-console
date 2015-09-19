angular.module('core').directive('logoUploader', [
    'FileUploader',
    'LOGO',
    function(FileUploader,LOGO){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                model: '=',
                uploader: '=',
                onremove: '&'
            },
            templateUrl: 'modules/core/views/partials/logo-uploader.html',
            link: function(scope, element, attrs){
                //TODO: For some inexplicable fucking reason you can't instantiate the FileUploader
                //TODO: in the directive and have it passed to the template properly.  Fix as this
                //TODO: is really, really annoying, would love to not have to instantiate in the controller

                scope.max_size_kb = LOGO.max_size_kb;
                scope.max_width = LOGO.max_width;
                scope.max_height = LOGO.max_height;
                scope.default_logo_url = LOGO.default_url;

                //##### FILTERS ######
                scope.uploader.filters.push({
                    name: 'mimetypeFilter',
                    fn: function(item, options) {
                        var mimetypes = ['image/jpeg', 'image/png'];
                        return mimetypes.indexOf(item.type) > -1;
                    }
                });

                scope.uploader.filters.push({
                    name: 'sizeFilter',
                    fn: function(item, options) {
                        var max_size = scope.max_size_kb * 1024;
                        return item.size < max_size;
                    }
                });

                //##### CALLBACKS ######
                scope.upload_errors = [];
                scope.uploader.onWhenAddingFileFailed = function(item, filter, options) {
                    if (filter.name === 'mimetypeFilter'){
                        scope.upload_error = 'File must be JPG or PNG ';
                    } else if (filter.name === 'sizeFilter'){
                        scope.upload_error = 'File must be less than ' + scope.max_size_kb + 'KB';
                    }
                };

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
                                // Now check to make sure dimensions are supported, calling callback
                                // if they're not.
                                if (!(self.width <= scope.max_width && self.height <= scope.max_height)){
                                    scope.upload_error = 'Logo must be no more than ' + scope.max_width + 'px wide or ' + scope.max_height + ' pixels tall';
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
                    if (scope.upload_error){
                        scope.upload_error = null;
                    }
                    scope.logo_loading = true;
                    scope.uploader.uploadAll();
                };

                scope.uploader.onCompleteItem = function(fileItem, response, status, headers) {
                    // Add Google Cloud URL to fileitem when it successfully uploads
                    if (!scope.model.logo){
                        scope.model.logo = {};
                    }
                    scope.model.logo_url = response.url;
                    scope.logo_loading = false;
                };

                scope.removeLogo = function(){
                    scope.model.logo_url = scope.default_logo_url;
                    if (scope.onremove){
                        scope.onremove();
                    }
                };
            }
        };
    }
]);

