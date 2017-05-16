angular.module('advertiser').directive('advertiserListItem', ['ngDialog', 'Notify',function(ngDialog, Notify) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            advertiser: '='
        },
        templateUrl: 'modules/advertiser/views/partials/advertiser-list-item.html',
        link: function(scope, element, attrs){
            scope.advertiserBasics = function(advertiser){
                ngDialog.open({
                    template: 'modules/advertiser/views/partials/advertiser-inline.html',
                    controller: ['$scope','$location',function($scope, $location){
                        $scope.advertiser = $scope.ngDialogData.advertiser;
                        $scope.update = function () {
                            if ($scope.advertiserBasicsForm.$valid) {
                                var advertiser = $scope.advertiser;
                                advertiser.$update(function () {
                                    Notify.alert('Advertiser details successfully updated');
                                    $scope.closeThisDialog(0);
                                }, function (errorResponse) {
                                    Notify.alert('Error saving advertiser: ' + errorResponse.message, {status: 'danger'});
                                });
                            }
                        };
                    }],
                    data: {advertiser: advertiser}
                });
            };

        }
    };
}]);
