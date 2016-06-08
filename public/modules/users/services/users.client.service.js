'use strict';

// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Users', ['$resource',
	function($resource) {
		return $resource('console/users', {}, {
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
)
.factory('userIdenticon',['Authentication',
    /**
     * Generates unique "Identicon" using username as a hash
     */
    function(Authentication){
        // create a base64 encoded PNG
        var options = {
            background: [30,165,98,1],
            size: 100
        };
        var identicon = new Identicon(Authentication.user._id, options).toString();
        // Include image prefix for rendering in template, could make this optional
        return 'data:image/png;base64,' + identicon;
    }
]);