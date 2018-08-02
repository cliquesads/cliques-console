/* global _, angular, moment, user */
'use strict';

angular.module('salesperson').controller('SalesPersonController', function($scope, $location, ngDialog, Users, SalesPerson, Notify) {
    $scope.perPageOptions = [ 5, 10, 25, 50, 100 ];
    $scope.queryParams = {
        perPage: 10,
        site: null,
        sort_by: "lastName,desc"
    };
    $scope.salesPeople = [];
    $scope.pagination = {
        count: null,
        pages: null,
        start: 0,
        end: 0
    };

    $scope.salesPeople = [];

    $scope.getSalesPeople = function(page) {
        // TODO: $http's returned promise's $resolved property doesn't
        // TODO: exactly behave as expected here so have to manually set resolved flags,
        // TODO: which is really annoying
        $scope.resolved = false;
        $scope.salesPeople = [];
        $scope.queryParams.page = page;
        $scope.salesPeopleRequest = SalesPerson.query($scope.queryParams).$promise
            .then(function(response) {
                $scope.resolved = true;
                $scope.pagination.count = response.count;
                $scope.pagination.pages = response.pages;
                $scope.pagination.start = response.count ? $scope.queryParams.perPage * ($scope.queryParams.page - 1) + 1 : 0;
                $scope.pagination.end = response.count ? $scope.pagination.start + response.results.length - 1 : 0;
                $scope.salesPeople = response.results;
            }, function(errorResponse) {
                $scope.resolved = true;
                Notify.alert(errorResponse.message, {status: 'danger'});
            });
    };
    $scope.getSalesPeople(1);

    $scope.newSalesPerson = function(){
        ngDialog.open({
            template: 'modules/salesperson/views/create-salesperson-dialog.html',
            className: 'ngdialog-theme-default dialogwidth650',
            controller: ['$scope','SalesPerson', function(scope, SalesPerson){
                scope.salesperson= new SalesPerson({
                    firstName: null,
                    lastName: null,
                    email: null
                });

                scope.submit = function(){
                    scope.error = null;
                    if (scope.salesPersonForm.$valid){
                        scope.loading = true;
                        // create the accessLink first
                        scope.salesperson.$create(function(salesPerson){
                            // once it's created, hit endpoint to send to user
                            Notify.alert('Salesperson ' + scope.salesperson.firstName + ' ' + scope.salesperson.lastName + ' created.',
                                {status: 'success'});
                            scope.closeThisDialog(salesPerson);
                            scope.loading = false;
                            $scope.salesPeople.splice(0, 0, salesPerson);
                        }, function(errorResponse){
                            scope.loading = false;
                            scope.error = errorResponse.data.message;
                        });
                    }
                };
            }]
        });
    };
});
