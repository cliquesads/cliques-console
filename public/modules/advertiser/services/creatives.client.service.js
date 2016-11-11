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
);
