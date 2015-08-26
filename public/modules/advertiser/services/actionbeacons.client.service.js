'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('advertiser').factory('ActionBeacon', ['$http',
    function($http) {
        var actionbeaconfactory = {};
        actionbeaconfactory.getTag = function(params) {
            var path = '/advertiser/' + params.advertiserId + '/actionbeacon/' + params.actionbeaconId;
            var queryParams = { secure: params.secure || false };
            return $http.get(path, {params: queryParams});
        };
        return actionbeaconfactory;
    }
]);
