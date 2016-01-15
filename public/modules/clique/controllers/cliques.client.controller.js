/* global _, angular */
'use strict';

angular.module('clique').controller('CliqueController', ['$scope', '$stateParams', '$location',
    '$http','Authentication','Advertiser','Clique',
    'getCliqueTree','getSitesInClique','getSitesInCliqueBranch','ngDialog',
	function($scope, $stateParams, $location, $http,Authentication,Advertiser,
             Clique, getCliqueTree, getSitesInClique,getSitesInCliqueBranch, ngDialog) {
		$scope.authentication = Authentication;
        $scope.networkAdmin = $scope.authentication.user.roles.indexOf('networkAdmin') > 0;

        // This is our API control variable
        var tree;
        $scope.my_tree = tree = {};

        // Populate tree data for tree visualization
        $scope.cliques = [];
		$scope.find = function() {
            getCliqueTree({},function(err, cliques){
                $scope.cliques = cliques;
            });
		};

        // Row template to pass to multi-select
        $scope.rowTemplate = '<div class="col-md-3"><img ng-src="{{ option.logo_secure_url }}" class="client-logo-sm"/>' +
                                '</div><div class="col-md-9"><h4 class="list-group-item-heading" data-ng-bind="option.name">' +
                                '</h4><p class="list-group-item-text"> Active Campaigns: {{ option.campaigns.length }}</p></div>';

        // Dialog box to select default advertisers
        $scope.editDefaultAdvertisers = function(){
            $scope.editCliqueForm.$dirty = true;
            ngDialog.open({
                template: '<strong>Select the Default Advertisers for this Clique</strong>' +
                        '<div style="overflow: auto; height: 400px">' +
                        '<row-multi-select base-model="ngDialogData.clique.default_advertisers" row-template="{{ ngDialogData.rowTemplate }}" options="ngDialogData.advertisers">' +
                        '</row-multi-select></div>',
                plain: true,
                controller: ['$scope', function ($scope) {}],
                data: {rowTemplate: $scope.rowTemplate, clique: $scope.clique, advertisers: $scope.advertisers}
            });
        };

        // TODO: This doesn't work because child scope is entered when dialog opens
        // TODO: just going to set dirty to true whenever dialog box is opened for now
        // Default advertisers selector isn't part of the form, so have to manually set form to dirty
        // when default advertisers is modified
        //$scope.$watch(function(scope){
        //    if (scope.clique) return scope.clique.default_advertisers
        //}, function(newVal, oldVal){
        //    if (newVal && oldVal && (newVal != oldVal)){
        //        $scope.editCliqueForm.$dirty = true;
        //    }
        //});

        $scope.clique = null;
        $scope.advertisers = Advertiser.query();

        $scope.resetEditForm = function(){
            $scope.editDefaultAdvertisers = false;
            var b = tree.get_selected_branch();
            $scope.clique = angular.copy(b.clique);
            this.editCliqueForm.$setPristine();
        };

        $scope.set_clique = function(branch) {
            $scope.clique = angular.copy(branch.clique);
        };

        // recursive function to get ancestors to save new clique
        function get_clique_ancestors(branch,ancestors) {
            ancestors = ancestors || [branch.label];
            var parent = tree.get_parent_branch(branch);
            if (parent) {
                ancestors.unshift(parent.label);
                return get_clique_ancestors(parent, ancestors);
            } else {
                return ancestors;
            }
        }

        $scope.save = function(){
            if (this.editCliqueForm.$valid) {
                $scope.clique.default_advertisers = $scope.clique.default_advertisers
                    .map(function(adv){ return adv._id; });
                $scope.clique.$update(function(response){
                    var b = tree.get_selected_branch();
                    b.clique = response;
                    $scope.editCliqueForm.$setPristine();
                    $scope.set_clique(b);
                }, function(response){
                    $scope.update_error  = response.data.message;
                });
            } else {
                return false;
            }
        };
	}
]);