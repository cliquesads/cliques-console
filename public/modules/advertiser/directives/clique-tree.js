angular.module('advertiser').directive('cliqueTree', ['getCliqueTree',function(getCliqueTree) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            cliquemodel: '=',
            wizardstep: '@'
        },
        templateUrl: 'modules/advertiser/views/partials/clique-tree.html',
        link: function (scope, element, attrs) {
            //// Populate tree data for tree visualization
            scope.cliques = [];
            getCliqueTree(scope);
            scope.set_clique = function(branch) {
                scope.campaign.clique = branch.label;
            };
            var tree;
            // This is our API control variable
            scope.my_tree = tree = {};
        }
    }
}]);
