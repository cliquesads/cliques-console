
angular.module('advertiser').directive('nativeCreativeUploader', [
    'NATIVE_SPECS','ngDialog',
    function(NATIVE_SPECS, ngDialog){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                onuploadall: '&',
                wizardstep: '@',
                width: '@',
                uploader: '='
            },
            templateUrl: 'modules/advertiser/views/partials/native-creative-uploader.html',
            link: function(scope, element, attrs){
                scope.NATIVE_SPECS = NATIVE_SPECS;

                //##### FILTERS ######
                scope.uploader.filters.push({
                    name: 'mimetypeFilter',
                    fn: function(item, options) {
                        var mimetypes = ['image/jpeg','image/png'];
                        return mimetypes.indexOf(item.type) > -1;
                    }
                });

                scope.uploader.filters.push({
                    name: 'sizeFilter',
                    fn: function(item, options) {
                        var max_size = scope.NATIVE_SPECS.image.maxSizeKb * 1024;
                        return item.size < max_size;
                    }
                });

                //##### CALLBACKS ######
                scope.creative_upload_errors = [];
                scope.uploader.onWhenAddingFileFailed = function(item, filter, options) {
                    if (filter.name === 'mimetypeFilter'){
                        scope.creative_upload_error = 'File must be JPG or PNG';
                    } else if (filter.name === 'sizeFilter'){
                        scope.creative_upload_error = 'File must be less than ' + scope.NATIVE_SPECS.image.maxSizeKb + 'KB';
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
                                // Store width & height properties on file object for convenience
                                fileItem.rawImageH = self.height;
                                fileItem.rawImageW = self.width;

                                var tooBig = self.height > scope.NATIVE_SPECS.image.maxHeightPx || self.width > scope.NATIVE_SPECS.image.maxWidthPx;
                                var tooSmall = self.height < scope.NATIVE_SPECS.image.minHeightPx || self.width < scope.NATIVE_SPECS.image.minWidthPx;
                                // Now check to make sure dimensions are supported, calling callback
                                // if they're not.
                                if (tooBig || tooSmall){
                                    scope.creative_upload_error = 'File dimensions not supported. Image dimensions must be between ' +
                                        scope.NATIVE_SPECS.image.minHeightPx + 'x' + scope.NATIVE_SPECS.image.minWidthPx + ' and ' +
                                        scope.NATIVE_SPECS.image.maxHeightPx + 'x' + scope.NATIVE_SPECS.image.maxWidthPx + '.';
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
                    fileItem.imageUrl = response.url;
                };

                scope.uploadAllWrapper = function(){
                    // validate form before calling upload all callback
                    if (scope.nativeCreativeUploadQueue.$valid){
                        return scope.onuploadall();
                    }
                };

                scope.validateInput = function(name, type) {
                    var input = this.nativeCreativeUploadQueue[name];
                    return (input.$dirty || scope.submitted) && input.$error[type];
                };

                scope.openTrackerDialog = function(creative){
                    ngDialog.open({
                        className: 'ngdialog-theme-default dialogwidth400',
                        template: 'modules/advertiser/views/partials/add-trackers-dialog.html',
                        controller: ['$scope',function($scope){
                            $scope.creative = $scope.ngDialogData.creative;
                            $scope.submit = function(){
                                if ($scope.trackersForm.$valid){
                                    $scope.closeThisDialog(true);
                                }
                            };
                        }],
                        data: {creative: creative }
                    });
                };
            }
        };
    }
]);
