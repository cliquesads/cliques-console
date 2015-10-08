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
    return function(clique_id){
        return $http.get('/sitesinclique/' + clique_id,{})
    }
}]);