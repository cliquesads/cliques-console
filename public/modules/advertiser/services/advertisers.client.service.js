'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('advertiser').factory('Advertiser', ['$resource',
	function($resource) {
		return $resource('console/advertiser/:advertiserId', { advertiserId: '@_id'},
            {
			    update: { method: 'PATCH'},
                create: { method: 'POST'},
                updateOrCreate: { method: 'PUT'}
		    }
        );
	}
])
.factory('CampaignActivator', ['$http',
        function($http){
            var activator = {};
            activator.activate = function(params){
                var path = '/console/advertiser/' + params.advertiserId + '/campaign/' + params.campaignId + '/activate';
                return $http.put(path);
            };
            activator.deactivate = function(params){
                var path = '/console/advertiser/' + params.advertiserId + '/campaign/' + params.campaignId + '/deactivate';
                return $http.put(path);
            };
            return activator;
        }
    ]
);