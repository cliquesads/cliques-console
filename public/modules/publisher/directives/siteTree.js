angular.module('publisher').directive('siteTree', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            sites: '='
        },
        templateUrl: 'modules/publisher/views/partials/site-tree.html',
        link: function (scope, element, attrs) {
            scope.templateStr = '<img src="{{ node.logo_secure_url }}"/> {{ trvw.label(node) }}'
        }
    };
}]);
