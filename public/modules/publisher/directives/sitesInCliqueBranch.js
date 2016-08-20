/**
 * Created by bliang on 1/14/16.
 */
angular.module('publisher').directive('sitesInCliqueBranch', ['getSitesInCliqueBranch','openSiteDescriptionDialog','CLIQUE_ICON_CLASSES',
    function(getSitesInCliqueBranch, openSiteDescriptionDialog, CLIQUE_ICON_CLASSES) {
        return {
            restrict: 'E',
            scope: {
                cliqueId: '=',
                size: '@'
            },
            templateUrl: 'modules/publisher/views/partials/sites-in-clique-branch.html',
            link: function (scope, element, attrs) {
                scope.size = scope.size || 'md';
                // get all sites in same branch as selected node
                scope.$watch('cliqueId', function(newVal, oldVal){
                    if (newVal){
                        getSitesInCliqueBranch(scope.cliqueId).then(function(response){
                            var sites = response.data;
                            // get primary clique and separate out sites into separate var
                            var i = _.findIndex(sites, function(obj){ return obj._id === scope.cliqueId; });
                            scope.primary_sites = sites.splice(i,1)[0];
                            scope.sites = sites;
                        });
                    }
                });
                scope.getDescription = function(site){
                    openSiteDescriptionDialog(site);
                };

                // maps icon classes to Clique _id's
                scope.iconClasses = CLIQUE_ICON_CLASSES;
            }
        }
    }
]);
