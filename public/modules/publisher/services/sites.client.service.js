/**
 * Created by bliang on 1/14/16.
 */

angular.module('publisher').factory('openSiteDescriptionDialog', ['ngDialog',
    function(ngDialog){
        return function(site){
            ngDialog.open({
                className: 'ngdialog-theme-default',
                template: 'modules/publisher/views/partials/site-description-dialog.html',
                controller: ['$scope', 'CLIQUE_ICON_CLASSES', function ($scope, CLIQUE_ICON_CLASSES) {
                    $scope.site = $scope.ngDialogData.site;
                    $scope.iconClasses = CLIQUE_ICON_CLASSES;
                }],
                data: {site: site}
            });
        };
}]);
