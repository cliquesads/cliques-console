/**
 * Created by Chuoxian Yang on 21/3/2017
 */
 /* global _, angular, user */
angular.module('analytics').directive('queryGraphTable', ['MongoTimeSeries', 'HourlyAdStat', 'DTOptionsBuilder', 'DTColumnDefBuilder', function(MongoTimeSeries, HourlyAdStat, DTOptionsBuilder, DTColumnDefBuilder) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
        	dateRanges: '=',
            dateRangeTitle: '=',
            timeUnit: '=',
            summaryDateRangeSelection: '=',
            graphQueryParam: '=',
            tabQueryParams: '='
        },
        templateUrl: 'modules/analytics/views/partials/query-graph-table.html',
        link: function(scope, element, attrs) {
        	/**
        	 * Depending on different user types(advertiser, publisher or networkAdmin), the query function can be different
        	 */
        	if (user) {
        	    if (user.organization.organization_types.indexOf('networkAdmin') > -1){
        	        scope.queryFunction = HourlyAdStat.query;
        	    } else if (user.organization.organization_types.indexOf('advertiser') > -1){
        	        scope.queryFunction = HourlyAdStat.advSummaryQuery;
        	    } else if (user.organization.organization_types.indexOf('publisher') > -1){
        	        scope.queryFunction = HourlyAdStat.pubSummaryQuery;
        	    }
        	}
			// Listens to the 'launchQuery' message sent by parent controller, whenever receives it, send query http request with query params and display results
            scope.$on('launchQuery', function(event, args) {
            	scope.queryForGraphAndTabData();
            });
            scope.queryForGraphAndTabData = function() {
                // Actual query requests happen here
                scope.getQueryGraph(scope.graphQueryParam);
                scope.getTabData();
            };
            scope.getQueryGraph = function() {
                // Pass "show-points" to graph directive to toggle line points
                // Only have this so points won't show for lines with tons of data
                scope.showPoints = scope.dateRanges[scope.summaryDateRangeSelection].showPoints;

                // query HourlyAdStats api endpoint
                scope.queryFunction(scope.graphQueryParam).then(function(response) {
                    scope.graphQueryResults = response.data;
                    scope.timeSeries = new MongoTimeSeries(
                    	response.data,
                    	scope.graphQueryParam.startDate,
                    	scope.graphQueryParam.endDate,
                    	user.tz,
                    	scope.timeUnit,
                    	{
	                        fields: [
	                            'imps', {
	                                'CTR': function(row) {
	                                    return row.clicks / row.imps;
	                                }
	                            },
	                            'clicks',
	                            'spend'
	                        ]
	                    }
	                );
                });
            };
            scope.tabFunctions = {
                cliques: function() {
                    // query HourlyAdStats endpoint
                    scope.queryFunction(scope.tabQueryParams.cliques).then(function(response) {
                        scope.tabQueryResults = response.data;
                        // build datatables options object
                        scope.dtOptions = DTOptionsBuilder.newOptions();
                        scope.dtOptions.withOption('paging', false);
                        scope.dtOptions.withOption('searching', false);
                        scope.dtOptions.withOption('scrollX', true);
                        scope.dtOptions.withOption('order', [
                            [1, 'desc']
                        ]);
                        // Not entirely sure if this is necessary
                        scope.dtColumnDefs = [
                            DTColumnDefBuilder.newColumnDef(0),
                            DTColumnDefBuilder.newColumnDef(1),
                            DTColumnDefBuilder.newColumnDef(2),
                            DTColumnDefBuilder.newColumnDef(3),
                            DTColumnDefBuilder.newColumnDef(4),
                            DTColumnDefBuilder.newColumnDef(5)
                        ];
                        scope.cliqueData = response.data;
                    });
                },
                publishers: function() {
                    // query HourlyAdStats api endpoint
                    scope.queryFunction(scope.tabQueryParams.publishers).then(function(response) {
                        scope.tabQueryResults = response.data;
                        // build datatables options object
                        scope.dtOptions_pubs = DTOptionsBuilder.newOptions();
                        scope.dtOptions_pubs.withOption('paging', false);
                        scope.dtOptions_pubs.withOption('searching', false);
                        scope.dtOptions_pubs.withOption('scrollX', true);
                        scope.dtOptions_pubs.withOption('order', [
                            [2, 'desc']
                        ]);
                        // Not entirely sure if this is necessary
                        scope.dtColumnDefs_pubs = [
                            DTColumnDefBuilder.newColumnDef(0),
                            DTColumnDefBuilder.newColumnDef(1),
                            DTColumnDefBuilder.newColumnDef(2),
                            DTColumnDefBuilder.newColumnDef(3),
                            DTColumnDefBuilder.newColumnDef(4),
                            DTColumnDefBuilder.newColumnDef(5),
                            DTColumnDefBuilder.newColumnDef(6)
                        ];
                        scope.publisherData = response.data;
                    });
                },
                advertisers: function() {
                    // query HourlyAdStats api endpoint
                    scope.queryFunction(scope.tabQueryParams.advertisers).then(function(response) {
                        scope.tabQueryResults = response.data;
                        // build datatables options object
                        scope.dtOptions_advs = DTOptionsBuilder.newOptions();
                        scope.dtOptions_advs.withOption('paging', false);
                        scope.dtOptions_advs.withOption('searching', false);
                        scope.dtOptions_advs.withOption('scrollX', true);
                        scope.dtOptions_advs.withOption('order', [
                            [2, 'desc']
                        ]);
                        // Not entirely sure if this is necessary
                        scope.dtColumnDefs_advs = [
                            DTColumnDefBuilder.newColumnDef(0),
                            DTColumnDefBuilder.newColumnDef(1),
                            DTColumnDefBuilder.newColumnDef(2),
                            DTColumnDefBuilder.newColumnDef(3),
                            DTColumnDefBuilder.newColumnDef(4),
                            DTColumnDefBuilder.newColumnDef(5),
                            DTColumnDefBuilder.newColumnDef(6)
                        ];
                        scope.advertiserData = response.data;
                    });
                }
            };
            scope.getTabData = function(tab) {
                tab = tab || scope.activeTab;
                scope.activeTab = tab;
                scope.tabFunctions[tab]();
            };

            scope.getQueryGraph();
        }
    };
}]);
