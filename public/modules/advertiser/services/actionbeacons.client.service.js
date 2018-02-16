'use strict';

angular.module('advertiser').factory('ActionBeacon', ['$http',
    function($http) {
        var actionbeaconfactory = {};
        actionbeaconfactory.getTag = function(params) {
            var path = '/console/advertiser/' + params.advertiserId + '/actionbeacon/' + params.actionbeaconId;
            var queryParams = { secure: params.secure || false };
            return $http.get(path, {params: queryParams});
        };
        return actionbeaconfactory;
    }
]);
