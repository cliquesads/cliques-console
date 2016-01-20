/**
 * Created by bliang on 1/14/16.
 */

angular.module('publisher').factory('openSiteDescriptionDialog', ['ngDialog',function(ngDialog){
    return function(site){
        ngDialog.open({
            className: 'ngdialog-theme-default',
            template: 'modules/publisher/views/partials/site-description-dialog.html',
            controller: ['$scope', function ($scope) {
                $scope.site = $scope.ngDialogData.site;
            }],
            data: {site: site}
        });
    };
}]);
