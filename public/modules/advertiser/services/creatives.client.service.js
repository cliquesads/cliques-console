'use strict';

angular.module('advertiser').factory('CreativeActivator',['$http',
        function($http){
            var activator = {};
            function basePath(params){
                return '/console/advertiser/' + params.advertiserId + '/campaign/' + params.campaignId + '/creativegroup/' + params.creativeGroupId + '/creative/' + params.creativeId;
            }
            activator.activate = function(params){
                var path = basePath(params) + '/activate';
                return $http.put(path);
            };
            activator.deactivate = function(params){
                var path = basePath(params) + '/deactivate';
                return $http.put(path);
            };
            return activator;
        }
    ]
).factory('CreativeRemover', ['$http',
    // Don't want to make this a full-fledged resource as only the "DELETE" method is supported
    // against this endpoint right now.
    function($http) {
        var factory = {};
        factory.remove = function(params) {
            var path = '/console/advertiser/' + params.advertiserId
                + '/campaign/' + params.campaignId
                + '/creativegroup/' + params.creativeGroupId
                + '/creative/' + params.creativeId;
            return $http.delete(path, {});
        };
        factory.removeMany = function(params){
            var path = '/console/advertiser/' + params.advertiserId
                + '/campaign/' + params.campaignId + '/remove-creatives';
            return $http.put(path, { creatives: params.creatives });
        };
        return factory;
    }
]);
