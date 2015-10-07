/**
 * Created by bliang on 8/15/15.
 */
angular.module('advertiser').directive('doubleclickCreativeUploader', [
    'CREATIVE_SIZES','DoubleClickTag',
    function(CREATIVE_SIZES,DoubleClickTag){
        'use strict';
        return {
            restrict: 'E',
            scope: {

            },
            templateUrl: 'modules/advertiser/views/partials/doubleclick-creative-uploader.html',
            link: function(scope, element, attrs){
                scope.CREATIVE_SIZES = CREATIVE_SIZES;
                scope.insertMacros = function(){
                    var js_tag = new DoubleClickTag.Javascript(scope.dfa_tag);
                    scope.dfa_tag = js_tag.insertMacros();
                }
            }
        };
    }
]);
