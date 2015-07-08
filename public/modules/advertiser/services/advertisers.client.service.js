'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('advertiser').factory('Advertiser', ['$resource',
	function($resource) {
		return $resource('advertiser/:advertiserId', { adv_id: '@_id'},
            {
			    update: { method: 'PATCH'},
                create: { method: 'POST'},
                updateOrCreate: { method: 'PUT'}
		    }
        );
	}
]);