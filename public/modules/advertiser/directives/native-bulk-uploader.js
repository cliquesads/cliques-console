/* global _, angular, moment, XLSX */

angular.module('advertiser').directive('nativeBulkUploader', [
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
            templateUrl: 'modules/advertiser/views/partials/native-bulk-uploader.html',
            link: function(scope, element, attrs){
                scope.NATIVE_SPECS = NATIVE_SPECS;

                //##### FILTERS ######
                scope.uploader.filters.push({
                    name: 'mimetypeFilter',
                    fn: function(item, options) {
                        var mimetypes = ['application/vnd.ms-excel',
                            'application/msexcel',
                            'application/x-msexcel',
                            'application/x-ms-excel',
                            'application/x-excel',
                            'application/x-dos_ms_excel',
                            'application/xls',
                            'application/x-xls',
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'text/csv',

                        ];
                        return mimetypes.indexOf(item.type) > -1;
                    }
                });

                //##### CALLBACKS ######
                scope.creative_upload_errors = [];
                scope.uploader.onWhenAddingFileFailed = function(item, filter, options) {
                    if (filter.name === 'mimetypeFilter'){
                        scope.creative_upload_error = 'File must be .xls, xlsx or .csv';
                    }
                };

                scope.uploader.onAfterAddingFile = function(fileItem) {
                    var reader = new FileReader();
                    // Have to use onload callbacks for both FileReader & Image objects,
                    // then load data to each
                    reader.onload = function(event){
                        var data = new Uint8Array(event.target.result);
                        scope.xlsx = XLSX.read(data, { type: 'array'});
                        var worksheet = scope.xlsx.Sheets[scope.xlsx.SheetNames[0]];
                        var container = document.getElementById('xlsx');
                        container.innerHTML = XLSX.utils.sheet_to_html(worksheet);
                    };
                    // load file
                    reader.readAsArrayBuffer(fileItem._file);
                };

                scope.uploader.onAfterAddingAll = function(addedFileItems) {
                    if (scope.creative_upload_error){
                        scope.creative_upload_error = null;
                    }
                    console.info('onAfterAddingAll', addedFileItems);
                };
                scope.uploader.onBeforeUploadItem = function(item) {
                    console.info('onBeforeUploadItem', item);
                };
                scope.uploader.onProgressItem = function(fileItem, progress) {
                    console.info('onProgressItem', fileItem, progress);
                };
                scope.uploader.onProgressAll = function(progress) {
                    console.info('onProgressAll', progress);
                };
                scope.uploader.onSuccessItem = function(fileItem, response, status, headers) {
                    console.info('onSuccessItem', fileItem, response, status, headers);
                };
                scope.uploader.onErrorItem = function(fileItem, response, status, headers) {
                    console.info('onErrorItem', fileItem, response, status, headers);
                };
                scope.uploader.onCancelItem = function(fileItem, response, status, headers) {
                    console.info('onCancelItem', fileItem, response, status, headers);
                };
                scope.uploader.onCompleteItem = function(fileItem, response, status, headers) {
                    // // Add Google Cloud URL to fileitem when it successfully uploads
                    // fileItem.imageUrl = response.url;
                };

                scope.uploadAllWrapper = function(){
                    // validate form before calling upload all callback
                    if (scope.nativeBulkUploadQueue.$valid){
                        return scope.onuploadall();
                    }
                };

                scope.validateInput = function(name, type) {
                    var input = this.nativeCreativeUploadQueue[name];
                    return (input.$dirty || scope.submitted) && input.$error[type];
                };
            }
        };
    }
]);
