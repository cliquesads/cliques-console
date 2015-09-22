angular.module('publisher').directive('siteTree', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            sites: '='
        },
        template: '<div ivh-treeview="sites"></div>',
        link: function (scope, element, attrs) {
            scope.options = {
                twistieCollapsedTpl: '<span class="fa fa-plus"></span>',
                twistieExpandedTpl: '<span class="fa fa-minus"></span>',
                twistieLeafTpl: '&#9679;'
            }
        }
    };
}]);
