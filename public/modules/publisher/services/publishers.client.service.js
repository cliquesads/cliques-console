'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('publisher').factory('Publisher', ['$resource',
	function($resource) {
		return $resource('console/publisher/:publisherId', { publisherId: '@_id'},
            {
			    update: { method: 'PATCH'},
                create: { method: 'POST'}
		    }
        );
	}
])
.factory('getSitesInClique', ['$http', function($http){
    /**
     * Gets sites in specific Clique and formats for IVH-treeview plugin, adding
     * additional params used by placement targeting directive (logo_url, objectType)
     */
    return function(clique_id){
        return $http.get('/console/sitesinclique/' + clique_id,{});
    };
}])
.factory('getSitesInCliqueBranch', ['$http', function($http){
    /**
     * Gets sites in specific Clique and formats for IVH-treeview plugin, adding
     * additional params used by placement targeting directive (logo_url, objectType)
     */
    return function(clique_id){
        return $http.get('/console/sitesincliquebranch/' + clique_id,{});
    };
}])
.factory('flattenSiteCliques',[function(){
    /**
     * Flattens tree structure returned from 'sitesincliquebranch' API endpoint
     * to resemble closure-like tree structure required by Angular Tree DND library
     */
    return function(sitesInCliqueBranch){
        var flattened = [];
        sitesInCliqueBranch.forEach(function(clique){
            var c = _.clone(clique);
            c.nodeType = 'Clique';
            delete c.sites;
            c.parentId = null;
            flattened.push(c);
            clique.sites.forEach(function(site){
                var s = _.clone(site);
                s.nodeType = 'Site';
                delete s.pages;
                s.parentId = clique._id;
                flattened.push(s);
                site.pages.forEach(function(page){
                    var p = _.clone(page);
                    p.nodeType = 'Page';
                    delete p.placements;
                    p.parentId = site._id;
                    flattened.push(p);
                    page.placements.forEach(function(placement){
                        var pl = _.clone(placement);
                        pl.nodeType = 'Placement';
                        pl.parentId = page._id;
                        flattened.push(pl);
                    });
                });
            });
        });
        return flattened;
    };
}]);


