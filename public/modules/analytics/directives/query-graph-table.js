/**
 * Created by Chuoxian Yang on 21/3/2017
 */
 /* global _, angular, user */
angular.module('analytics').directive('queryGraphTable', ['$rootScope', 'MongoTimeSeries', 'HourlyAdStat', 'DTOptionsBuilder', 'DTColumnDefBuilder', function($rootScope, MongoTimeSeries, HourlyAdStat, DTOptionsBuilder, DTColumnDefBuilder) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
        	dateRanges: '=',
            dateRangeTitle: '=',
            timeUnit: '=',
            summaryDateRangeSelection: '=',
            graphQueryParam: '=',
            tableQueryParam: '='
        },
        templateUrl: 'modules/analytics/views/partials/query-graph-table.html',
        link: function(scope, element, attrs) {
        	/**
        	 * Depending on different user types(advertiser, publisher or networkAdmin), the query function can be different
        	 */
            scope.user = user;
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
            	scope.queryForGraphAndTableData();
            });
            scope.queryForGraphAndTableData = function() {
                // Actual query requests happen here
                scope.getQueryGraph();
                scope.getTableData();
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
            scope.getTableData = function() {
                // query HourlyAdStats endpoint
                scope.queryFunction(scope.tableQueryParam).then(function(response) {
                    scope.tableQueryResults = response.data;
                    // send message to parent controller notifying the query results
                    $rootScope.$broadcast('tableQueryResults', scope.tableQueryResults);
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
            };

            scope.getQueryGraph();
            scope.getTableData();
        }
    };
}]);
