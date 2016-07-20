'use strict';

/**
 * Factory to help query HourlyAdStat API endpoints.
 *
 *
 */
angular.module('aggregations').factory('HourlyAdStat', ['Authentication','$http',
	function(Authentication, $http) {
        // TODO: HACK, don't want to add demo flag on orgs yet so just hardcode here temporarily
        var demo = Authentication.user.organization._id === '578e90fced74a996159254a3';

        var base_path    = '/console/hourlyadstat';
        var adv_path     = base_path + '/adv';
        var pub_path     = base_path + '/pub';
        var advSummary_path = base_path + '/advSummary';
        var pubSummary_path = base_path + '/pubSummary';
        var clique_path  = base_path + '/clique';
        var hourlyadstatfactory = {};

        // Wrapper for query function so you don't have to
        // duplicate advertiser & publisher code
        function constructQueryFunc(hierarchy, basepath){
            return function(idsObject, queryParams){
                var relative_path = '';
                // constructs path param
                hierarchy.forEach(function(key){
                    if (idsObject.hasOwnProperty(key)){
                        relative_path += '/' + idsObject[key];
                    }
                });
                var path = basepath + relative_path;
                // set demo flag
                queryParams = queryParams || {};
                queryParams.demo = demo;
                return $http.get(path, {params: queryParams});
            };
        }
        hourlyadstatfactory.query = function(queryParams){
            // set demo flag
            queryParams = queryParams || {};
            queryParams.demo = demo;
            return $http.get(base_path, {params: queryParams});
        };
        hourlyadstatfactory.advSummaryQuery = function(queryParams){
            // set demo flag
            queryParams = queryParams || {};
            queryParams.demo = demo;
            return $http.get(advSummary_path, {params: queryParams});
        };
        hourlyadstatfactory.pubSummaryQuery = function(queryParams){
            // set demo flag
            queryParams = queryParams || {};
            queryParams.demo = demo;
            return $http.get(pubSummary_path, {params: queryParams});
        };
        hourlyadstatfactory.advQuery = constructQueryFunc(['advertiserId', 'campaignId', 'creativegroupId','creativeId'], adv_path);
        hourlyadstatfactory.pubQuery = constructQueryFunc(['publisherId', 'siteId', 'pageId','placementId'], pub_path);
        hourlyadstatfactory.cliqueQuery = function(queryParams){
            // set demo flag
            queryParams = queryParams || {};
            queryParams.demo = demo;
            return $http.get(clique_path, {params: queryParams});
        };

        return hourlyadstatfactory;
	}
]);