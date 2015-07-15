'use strict';

angular.module('clique').controller('CliqueController', ['$scope', '$stateParams', '$location', 'Authentication', 'Clique','getCliqueTree',
	function($scope, $stateParams, $location, Authentication, Clique, getCliqueTree) {
		$scope.authentication = Authentication;

        // Populate tree data for tree visualization
        $scope.cliques = [];
		$scope.find = function() {
            getCliqueTree($scope);
		};

        $scope.my_tree_handler = function(branch) {

            console.log("You selected: " + branch.label);

            if (branch.data && branch.data.description) {
                $scope.output += '(' + branch.data.description + ')';
                return $scope.output;
            }
        };
        var tree;
        // This is our API control variable
        $scope.my_tree = tree = {};
	}
]);