angular.module('advertiser').directive('displayPreview', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            creative: '='
        },
        templateUrl: 'modules/advertiser/views/partials/display-preview.html',
        link: function(scope, element, attr){
            scope.src = "https://adsrvs.cliquesads.com/cr?cid=" + scope.creative.id;
        }
    };
}]);