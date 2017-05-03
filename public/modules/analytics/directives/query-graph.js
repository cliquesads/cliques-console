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
			scope: {},
			templateUrl: 'modules/analytics/views/partials/query-graph.html',
			link: function(scope, element, attrs) {
				// table collapse state
				scope.isCollapsed = false;	
				scope.user = user;
				scope.isLoading = true;

				scope.dateRanges = aggregationDateRanges(user.tz);

				scope.$on('queryStarted', function(event, args) {
					scope.isLoading = true;
				});
				scope.$on('queryError', function(event, args) {
					scope.isLoading = false;
				});
				scope.$on('queryEnded', function(event, args) {
					scope.isLoading = false;
					scope.queryParam = args.queryParam;
					scope.humanizedDateRange = scope.queryParam.humanizedDateRange;

					// Pass "show-points" to graph directive to toggle line points
					// Only have this so points won't show for lines with tons of data
					scope.showPoints = scope.dateRanges[scope.queryParam.dateRangeShortCode].showPoints;

					scope.graphQueryResults = args.results;

					scope.timeSeries = new MongoTimeSeries(
						args.results,
						scope.queryParam.dateRange.startDate,
						scope.queryParam.dateRange.endDate,
						user.tz,
						scope.queryParam.dateGroupBy,
						{fields: fields}
					);
				});

				var fields = [
					'imps',
					{
						CTR: function(row) { return row.clicks / row.imps; }
					},
					'clicks',
					'spend'
				];
				// Graph showing data may vary depending on user type
				if (user.organization.organization_types.indexOf('publisher') > -1) {
					fields = ['imps', 'defaults', 'clicks', 'spend'];
				}
			}
		};
	}
]);