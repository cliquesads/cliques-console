/**
 * Created by bliang on 10/8/15
 */
angular.module('advertiser').directive('doubleclickCreativeUploader', [
    'CREATIVE_SIZES','DoubleClickTag','AdvertiserUtils','Notify',
    function(CREATIVE_SIZES,DoubleClickTag,AdvertiserUtils,Notify){
        'use strict';
        return {
            restrict: 'E',
            scope: {
                campaign: '=',
                onProcessingComplete: '&'
            },
            templateUrl: 'modules/advertiser/views/partials/doubleclick-creative-uploader.html',
            link: function(scope, element, attrs){
                scope.SUPPORTED_DIMENSIONS = CREATIVE_SIZES.supported_dimensions;
                scope.processAndUpload = function(){
                    var valid = $('#doubleClickForm').parsley().validate();
                    if (valid){
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
                            var creative = [{
                                name: scope.creative_name,
                                w: js_tag.w,
                                h: js_tag.h,
                                type: 'doubleclick',
                                tag: scope.dfa_tag,
                                click_url: '<doubleclick>',
                                url: js_tag.img_src
                            }];
                            var creativeGroup = AdvertiserUtils.groupCreatives(creative, scope.campaign.name);
                            AdvertiserUtils.updateCreativeGroups(creativeGroup, scope.campaign);
                            scope.dfa_tag = '';
                            scope.creative_name = '';
                            scope.onProcessingComplete();
                        }
                    }
                }
            }
        };
    }
]);
