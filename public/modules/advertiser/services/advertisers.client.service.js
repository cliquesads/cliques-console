'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('advertiser').factory('Advertiser', ['$resource',
	function($resource) {
		return $resource('advertiser/:advertiserId', { advertiserId: '@_id'},
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
                var path = '/advertiser/' + params.advertiserId + '/campaign/' + params.campaignId + '/activate';
                return $http.put(path);
            };
            activator.deactivate = function(params){
                var path = '/advertiser/' + params.advertiserId + '/campaign/' + params.campaignId + '/deactivate';
                return $http.put(path);
            };
            return activator;
        }
    ]
)
.factory('Campaign',['Advertiser',function(Advertiser){
        return {
            fromStateParams: function($stateParams, callback){
                Advertiser.get({advertiserId: $stateParams.advertiserId})
                    .$promise
                    .then(function(advertiser){
                        var i = _.findIndex(advertiser.campaigns, function(campaign){
                            return campaign._id === $stateParams.campaignId;
                        });
                        //$scope.campaign as pointer to campaign in advertiser.campaigns array
                        //this way, all Advertiser resource methods will work
                        var campaign = advertiser.campaigns[i];
                        return callback(null, advertiser, campaign);
                    });
            }
        }
    }
]);