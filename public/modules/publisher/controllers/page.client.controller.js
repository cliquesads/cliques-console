/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('editPageController', ['$scope','Publisher','ngDialog','TOOLTIPS',
	function($scope, Publisher,ngDialog,TOOLTIPS) {
        $scope.publisher = $scope.ngDialogData.publisher;

        // Set refs to nested documents in parent Publisher so $update method
        // can be used.  Don't know if this is entirely necessary but doing
        // to be safe, as I find Angular's handling of object refs kind of confusing
        var site_ind = _.findIndex($scope.publisher.sites, function(site){
            return site._id === $scope.ngDialogData.site._id;
        });
        $scope.site = $scope.publisher.sites[site_ind];
        var page_ind = _.findIndex($scope.site.pages, function(page){
            return page._id === $scope.ngDialogData.page._id;
        });
        $scope.page = $scope.publisher.sites[site_ind].pages[page_ind];

	}
]);