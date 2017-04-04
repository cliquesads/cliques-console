/**
 * Created by Chuoxian Yang on 3/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGraph', [
	'$rootScope',
	'Analytics',
	'aggregationDateRanges',
	'MongoTimeSeries',
	function(
		$rootScope,
		Analytics,
		aggregationDateRanges,
		MongoTimeSeries
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {

			},
			templateUrl: 'modules/analytics/views/partials/query-graph.html',
			link: function(scope, element, attrs) {
				// table collapse state
				scope.isCollapsed = false;	
				scope.user = user;
				scope.dateRanges = aggregationDateRanges(user.tz);
				scope.queryFunction = Analytics.queryFunction();
				scope.$on('launchQuery', function(event, args) {
					var queryParam = args.queryParam;
					scope.dateRangeTitle = args.dateRangeTitle;
					scope.getGraphData(queryParam);
				});
				scope.getGraphData = function(queryParam) {
					// Pass "show-points" to graph directive to toggle line points
					// Only have this so points won't show for lines with tons of data
					scope.showPoints = scope.dateRanges[queryParam.dateRangeShortCode].showPoints;

					// query HourlyAdStats api endpoint
					scope.queryFunction(queryParam)
					.then(function(response) {
						scope.graphQueryResults = response.data;
						scope.timeSeries = new MongoTimeSeries(
							response.data,
							queryParam.startDate,
							queryParam.endDate,
							user.tz,
							queryParam.dateGroupBy,
							{
								fields: [
									'imps',
									{
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
			}
		};
	}
]);