/* global _, angular */
'use strict';

angular.module('clique').controller('CliqueController', ['$scope', '$stateParams', '$location', 'Authentication', 'Clique','getCliqueTree','ngDialog',
	function($scope, $stateParams, $location, Authentication, Clique, getCliqueTree, ngDialog) {
		$scope.authentication = Authentication;

        // Populate tree data for tree visualization
        $scope.cliques = [];
		$scope.find = function() {
            getCliqueTree($scope);
		};

        $scope.clique = {
            _id: null,
            name: null
        };

        $scope.set_clique = function(branch) {
            $scope.clique._id = branch.label;
            $scope.clique.name = branch.label;
        };

        var tree;
        // This is our API control variable
        $scope.my_tree = tree = {};

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

        $scope.create_new_clique = function(){
            if (this.newCliqueForm.$valid) {
                var b;
                b = tree.get_selected_branch();
                var ancestors = get_clique_ancestors(b);
                var clique = new Clique({
                    name: this.new_clique_name,
                    parent: b.label,
                    ancestors: ancestors
                });
                clique.$create(function(response){
                    tree.add_branch(b, { label: $scope.new_clique_name});
                    $scope.new_clique_name = '';
                }, function(response){
                    $scope.creation_error  = response.data.message;
                });
            } else {
                return false;
            }
        };
        $scope.update_clique = function(){
            if (this.editCliqueForm.$valid) {
                var clique = new Clique({
                    _id: this.clique._id,
                    name: this.clique.name
                });
                clique.$update(function(response){
                    var b;
                    $scope.clique._id = $scope.clique.name;
                    b = tree.get_selected_branch();
                    b.label = $scope.clique._id;
                }, function(response){
                    $scope.update_error  = response.data.message;
                });
            } else {
                return false;
            }
        };
	}
]);