/**
 * Created by bliang on 10/8/15
 */
angular.module('advertiser').directive('doubleclickCreativeUploader', [
    'CREATIVE_SIZES','DoubleClickTag',
    function(CREATIVE_SIZES,DoubleClickTag){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                onUpload: '&'
            },
            templateUrl: 'modules/advertiser/views/partials/doubleclick-creative-uploader.html',
            link: function(scope, element, attrs){
                scope.SUPPORTED_DIMENSIONS = CREATIVE_SIZES.supported_dimensions;

                // creative queue
                scope.creatives = [];

                $('#doubleClickForm').parsley().destroy();

                scope.submitted = false;
                scope.validateInput = function(name, type) {
                    var input = scope.doubleClickForm[name];
                    return (input.$dirty || scope.submitted) && input.$error[type];
                };

                // Validates tag & creative form, inserts macros & adds to creative queue
                scope.processTag = function(){
                    scope.submitted = true;
                    if (scope.doubleClickForm.$valid){
                        // Validate that the tag is proper DCM Javascript
                        try {
                            var js_tag = new DoubleClickTag.Javascript(scope.dfa_tag);
                            scope.upload_error = false;
                        } catch (e){
                            scope.upload_error = 'Not a valid DFA Javascript Tag.';
                            return;
                        }

                        var dimensions_str = js_tag.w + 'x' + js_tag.h;
                        if (scope.SUPPORTED_DIMENSIONS.indexOf(dimensions_str) === -1){
                            scope.upload_error = 'File dimensions not supported. Creative dimensions must be one of the following: ' + scope.SUPPORTED_DIMENSIONS.join(', ');
                        } else {
                            scope.dfa_tag = js_tag.insertMacros();
                            var creative = {
                                name: scope.creative_name,
                                w: js_tag.w,
                                h: js_tag.h,
                                type: 'doubleclick',
                                tag: scope.dfa_tag,
                                click_url: '<doubleclick>',
                                url: js_tag.img_src
                            };
                            scope.creatives.push(creative);

                            // Now clean up form
                            scope.submitted = false;
                            scope.dfa_tag = '';
                            scope.creative_name = '';
                            scope.doubleClickForm.$setPristine();
                            // Have to do this for the wizard step, built-in validation and
                            // Parsely don't play well together
                        }
                    } else {
                        return false;
                    }
                };

                // Hook for upload method
                scope.upload = function(){
                    if (scope.creatives.length > 0){
                        scope.onUpload({creatives: scope.creatives});
                        scope.creatives = [];
                    }
                };

                scope.removeFromQueue = function(creative){
                    var ind = _.findIndex(scope.creatives, function(cr){
                        return cr === creative;
                    });
                    scope.creatives.splice(ind, 1);
                };
            }
        };
    }
]);
