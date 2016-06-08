'use strict';

angular.module('publisher').factory('PlacementTag', ['$http',
    function($http) {
        var placementTagFactory = {};
        placementTagFactory.getTag = function(params) {
            var path = '/console/publisher/'+params.publisherId+'/placement/'+params.placementId;
            var queryParams = {
                secure: params.secure || false,
                type: params.type || 'javascript'
            };
            return $http.get(path, {params: queryParams});
        };
        return placementTagFactory;
    }
]);
