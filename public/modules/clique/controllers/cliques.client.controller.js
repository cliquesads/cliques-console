'use strict';

/**
 * Formats Cliques query result for ABN-tree plugin
 *
 * @param query_result
 * @returns {*}
 */
function format_cliques_collection_for_tree(query_result){
    /**
     * Converts Clique collection into tree-structure object
     */
    function _get_or_create_branch(obj, branch_arr){
        if (branch_arr.length > 0){
            var child = branch_arr.shift();
            if (!obj.hasOwnProperty(child)){
                obj[child] = {};
            }
            obj = obj[child];
            return _get_or_create_branch(obj,branch_arr);
        }
    }
    /**
     * Recursive method to convert tree object into abn-formatted tree array
     */
    function _reformat_tree(cliques_tree, _destination_array){
        _destination_array = _destination_array || [];
        if (cliques_tree != {}){
            for (var key in cliques_tree){
                if (cliques_tree.hasOwnProperty(key)){
                    var obj = {
                        label: key,
                        children: []
                    };
                    _reformat_tree(cliques_tree[key], obj.children);
                    _destination_array.push(obj);

                }
            }
        }
        return _destination_array;
    }

    var cliques = {};
    query_result.forEach(function(clique){
        var ancestors = clique.ancestors;
        ancestors.push(clique._id);
        _get_or_create_branch(cliques, ancestors);
    });
    return _reformat_tree(cliques);
}

angular.module('clique').controller('CliqueController', ['$scope', '$stateParams', '$location', 'Authentication', 'Clique',
	function($scope, $stateParams, $location, Authentication, Clique) {
		$scope.authentication = Authentication;

        // Populate tree data for tree visualization
        $scope.cliques = [];
		$scope.find = function() {
            var query_result = Clique.query(function(){
                $scope.cliques = format_cliques_collection_for_tree(query_result);
            });
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