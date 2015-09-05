'use strict';

/**
 * Factory to help query HourlyAdStat API endpoints.
 *
 *
 */
angular.module('aggregations').factory('HourlyAdStat', ['$http',
	function($http) {
        var base_path    = '/hourlyadstat';
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
                return $http.get(path, {params: queryParams});
            };
        }
        hourlyadstatfactory.query = function(queryParams){
            return $http.get(base_path, queryParams);
        };
        hourlyadstatfactory.advSummaryQuery = function(queryParams){
            return $http.get(advSummary_path, queryParams);
        };
        hourlyadstatfactory.pubSummaryQuery = function(queryParams){
            return $http.get(pubSummary_path, queryParams);
        };
        hourlyadstatfactory.advQuery = constructQueryFunc(['advertiserId', 'campaignId', 'creativegroupId','creativeId'], adv_path);
        hourlyadstatfactory.pubQuery = constructQueryFunc(['publisherId', 'siteId', 'pageId','placementId'], pub_path);
        hourlyadstatfactory.cliqueQuery = function(queryParams){
            return $http.get(clique_path, queryParams);
        };

        return hourlyadstatfactory;
	}
]);