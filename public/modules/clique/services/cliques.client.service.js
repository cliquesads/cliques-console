'use strict';

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
]);