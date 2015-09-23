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

/**
 * Gets sites in specific Clique and formats for IVH-treeview plugin, adding
 * additional params used by placement targeting directive (logo_url, objectType)
 */
angular.module('publisher').factory('getSitesInCliqueTree', ['$http', function($http){
    return function(clique_id, scope){
        $http.get('/sitesinclique/' + clique_id,{})
            .then(function(response){
                var sites = response.data;
                var treedata = [];
                // Loop through sites array and format for ivh-treeview (label, value, children)
                sites.forEach(function(site){
                    var weight = 1;
                    var site_label = site.name + ' (' + site.pages.length + ' Page' + (site.pages.length != 1 ? 's': '') +')';
                    var leaf = {
                        label: site_label,
                        value: site._id,
                        objectType: 'site',
                        logo_secure_url: site.logo_secure_url,
                        url: 'http://' + site.domain_name,
                        weight: weight,
                        children: []
                    };
                    site.pages.forEach(function(page){
                        var page_label = page.name + ' (' + page.placements.length + ' Placement' + (page.placements.length != 1 ? 's': '') +')';
                        var page_leaf = {
                            label: page_label,
                            objectType: 'page',
                            value: page._id,
                            weight: weight,
                            url: page.url,
                            children: []
                        };
                        page.placements.forEach(function(placement){
                            var placement_node = {
                                label: placement.name,
                                value: placement._id,
                                weight: weight,
                                objectType: 'placement'
                            };
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