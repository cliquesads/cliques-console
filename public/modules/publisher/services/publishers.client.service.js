'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('publisher').factory('Publisher', ['$resource',
	function($resource) {
		return $resource('publisher/:publisherId', { publisherId: '@_id'},
            {
			    update: { method: 'PATCH'},
                create: { method: 'POST'},
                updateOrCreate: { method: 'PUT'}
		    }
        );
	}
]);

angular.module('publisher').factory('getSitesInCliqueTree', ['$http', function($http){
    return function(clique_id, scope){
        $http.get('/sitesinclique/' + clique_id,{})
            .then(function(response){
                var sites = response.data;
                var treedata = [];
                sites.forEach(function(site){
                    var leaf = {label: site.name,value: site._id,children: []};
                    site.pages.forEach(function(page){
                        var page_leaf = {label: page.name,value: page._id,children: []};
                        page.placements.forEach(function(placement){
                            var placement_node = {label: placement.name, value: placement._id};
                            page_leaf.children.push(placement_node);
                        });
                        leaf.children.push(page_leaf);
                    });
                    treedata.push(leaf);
                });
                scope.sites = treedata;
            });
    }
}]);