/**
 * Created by bliang on 1/14/16.
 */
angular.module('publisher').directive('sitesInCliqueBranch', ['getSitesInCliqueBranch',
    function(getSitesInCliqueBranch) {
        return {
            restrict: 'E',
            scope: {
                cliqueId: '='
            },
            templateUrl: 'modules/publisher/views/partials/sites-in-clique-branch.html',
            link: function (scope, element, attrs) {
                // get all sites in same branch as selected node
                scope.$watch('cliqueId', function(newVal, oldVal){
                    if (newVal){
                        getSitesInCliqueBranch(scope.cliqueId).then(function(response){
                            scope.sites = response.data;
                        });
                    }
                });
            }
        }
    }
]);
