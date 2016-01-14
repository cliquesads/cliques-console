'use strict';

// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Users', ['$resource',
	function($resource) {
		return $resource('users', {}, {
			update: {
				method: 'PUT'
			}
		});
	}
])
.factory('TermsAndConditions',['$http',
        /**
         * Service to call Terms & Conditions API.  Not a full resource, only expose
         * two methods.
         */
        function($http){
            return {
                /**
                 * Gets current terms & conditions by type
                 * @param type advertiser or publisher
                 * @returns {HttpPromise}
                 */
                getCurrent: function(type){
                    return $http.get('/terms-and-conditions/current/' + type);
                },
                /**
                 * Get by ID
                 * @param query.termsId ObjectId
                 * @returns {HttpPromise}
                 */
                get: function(query){
                    return $http.get('/terms-and-conditions/by-id/' + query.termsId);
                }
            };
        }
    ]
);