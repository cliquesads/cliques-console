/* global _, angular, moment, XLSX */

angular.module('advertiser').directive('nativeBulkUploader', [
    'NATIVE_SPECS','ngDialog','$http','$timeout',
    function(NATIVE_SPECS, ngDialog, $http, $timeout){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                onUploadSuccess: '&',
                preUploadValidator: '&',
                wizardstep: '@',
                width: '@',
                uploader: '='
            },
            templateUrl: 'modules/advertiser/views/partials/native-bulk-uploader.html',
            link: function(scope, element, attrs){
                scope.NATIVE_SPECS = NATIVE_SPECS;

                // Controls for steps. Only two steps but it's easier to use helper function cause
                // need to wrap update in a $timeout to trigget a digest cycle.
                scope.activeStep = 'upload';
                scope.goToStep = function(step){
                    $timeout(function(){
                        switch (step){
                            case 'upload':
                                scope.xlsxData = null;
                                scope.xlsx = null;
                                scope.uploader.clearQueue();
                                break;
                            case 'previewData':
                                break;
                            default:
                                break;
                        }
                        scope.activeStep = step;
                    });
                };


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

                // Array of object keys to assign to JSON resulting from spreadsheet parsing.
                // This doesn't indicate which "headers" to look for in the spreadsheet, but assumes a specific
                // the column order & assigns field values accordingly.
                scope.HEADERS = ['imageUrl','headline','description','click_url',
                    'name','category','impTracker','clickTracker'];

                scope.xlsxData = [];

                scope.uploader.onAfterAddingFile = function(fileItem) {
                    var reader = new FileReader();
                    // Have to use onload callbacks for both FileReader & Image objects,
                    // then load data to each
                    reader.onload = function(event){
                        var data = new Uint8Array(event.target.result);
                        scope.xlsx = XLSX.read(data, { type: 'array'});
                        // Use first worksheet
                        var worksheet = scope.xlsx.Sheets[scope.xlsx.SheetNames[0]];
                        // parse worksheet to JSON for easy manipulation, starting at row 2, using assumed headers
                        scope.xlsxData = XLSX.utils.sheet_to_json(worksheet, { header: scope.HEADERS, range: 1, blankRows: false });
                        scope.goToStep('previewData');
                    };
                    // load file
                    reader.readAsArrayBuffer(fileItem._file);
                };

                /**
                 * 1) Validate Form
                 * 2) Upload imageUrls to get Cloudinary assets
                 * 3) Call onuploadall function with cleaned creative data
                 */
                scope.finish = function(){
                    var validator = scope.preUploadValidator ? scope.preUploadValidator() : true;
                    if (this.bulkNativeUploadForm.$valid && validator){
                        var imageUrls = _.map(scope.xlsxData, function(row){
                            return row.imageUrl;
                        });
                        $http.post('/console/native-images/remote', { imageUrls: imageUrls }).then(
                            function(response){
                                // now zip cloudinary URLs and image metadata into xlsxData and pass to callback
                                var cloudinaryData = response.data;
                                var creatives = [];
                                scope.xlsxData.forEach(function(row){
                                    var imageMeta = cloudinaryData[row.imageUrl];
                                    // basically convert row to creative schema here. Don't have logo
                                    // vars yet so pass incomplete object to callback
                                    creatives.push({
                                        name: row.name || imageMeta.public_id,
                                        click_url: row.click_url,
                                        //TODO: default is set to true, change if that changes
                                        active: true,
                                        type: 'native',
                                        impTracker: row.impTracker,
                                        clickTracker: row.clickTracker,
                                        h: 1,
                                        w: 1,
                                        native: {
                                            secureImageUrl: imageMeta.url,
                                            imageUrl: imageMeta.url,
                                            imageH: imageMeta.height,
                                            imageW: imageMeta.width,
                                            headline: row.headline,
                                            description: row.description
                                        }
                                    });
                                });
                                scope.onUploadSuccess({ creatives: creatives });
                            }, function(error){
                                scope.creative_upload_error = error.data.message;
                            }
                        );
                    }
                };

                scope.validateInput = function(name, type) {
                    var input = this.bulkNativeUploadForm[name];
                    return (input.$dirty || scope.submitted) && input.$error[type];
                };
            }
        };
    }
]);
