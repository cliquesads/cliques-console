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
                        children: [],
                        clique: _.find(query_result, function(c){ return c._id === key; })
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
        var ancestors = angular.copy(clique.ancestors);
        ancestors.push(clique._id);
        _get_or_create_branch(cliques, ancestors);
    });
    return _reformat_tree(cliques);
}

//Articles service used for communicating with the articles REST endpoints
angular.module('clique').factory('Clique', ['$resource',
	function($resource) {
		return $resource('clique/:cliqueId', { cliqueId: '@_id'},
            {
			    update: { method: 'PATCH'},
                create: { method: 'POST'},
                updateOrCreate: { method: 'PUT'}
		    }
        );
	}
]).
factory('getCliqueTree', ['Clique', function(Clique){
        return function(query, callback){
            // Populate tree data for tree visualization
            var query_result = Clique.query(query, function(){
                var cliques = format_cliques_collection_for_tree(query_result);
                callback(null, cliques);
            });
        };
    }
]);