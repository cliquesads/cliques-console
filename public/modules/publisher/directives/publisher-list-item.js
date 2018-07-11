angular.module('publisher').directive('publisherListItem', ['ngDialog', 'Notify',function(ngDialog, Notify) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            publisher: '='
        },
        templateUrl: 'modules/publisher/views/partials/publisher-list-item.html',
        link: function(scope, element, attrs){
            scope.publisherBasics = function(publisher){
                ngDialog.open({
                    template: 'modules/publisher/views/partials/publisher-inline.html',
                    controller: ['$scope','$location',function($scope, $location){
                        $scope.publisher = $scope.ngDialogData.publisher;
                        $scope.update = function () {
                            if ($scope.publisherBasicsForm.$valid) {
                                var publisher = $scope.publisher;
                                publisher.$update(function () {
                                    Notify.alert('Publisher details successfully updated');
                                    $scope.closeThisDialog(0);
                                }, function (errorResponse) {
                                    Notify.alert('Error saving publisher: ' + errorResponse.message, {status: 'danger'});
                                });
                            }
                        };
                    }],
                    data: {publisher: publisher}
                });
            };
        }
    };
}]);
