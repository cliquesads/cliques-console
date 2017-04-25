/**
 * Created by Chuoxian Yang on 3/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryGraph', [
	'$rootScope',
	'Analytics',
	'aggregationDateRanges',
	'MongoTimeSeries',
	'Notify',
	function(
		$rootScope,
		Analytics,
		aggregationDateRanges,
		MongoTimeSeries,
		Notify
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {
				defaultQueryParam: '='
			},
			templateUrl: 'modules/analytics/views/partials/query-graph.html',
			link: function(scope, element, attrs) {
				scope.queryParam = scope.defaultQueryParam;
				// table collapse state
				scope.isCollapsed = false;	
				scope.user = user;
				scope.dateRanges = aggregationDateRanges(user.tz);
				scope.queryFunction = Analytics.queryFunction(scope.queryParam.type, $rootScope.role);
				scope.$on('launchQuery', function(event, args) {
					scope.queryParam = args.queryParam;
					scope.queryFunction = Analytics.queryFunction(scope.queryParam.type, $rootScope.role);
					scope.getGraphData(scope.queryParam);
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
				scope.getGraphData = function(queryParam) {
					scope.isLoading = true;
					scope.humanizedDateRange = queryParam.humanizedDateRange;

					// Pass "show-points" to graph directive to toggle line points
					// Only have this so points won't show for lines with tons of data
					scope.showPoints = scope.dateRanges[queryParam.dateRangeShortCode].showPoints;

					// query aggregations api endpoint
					scope.queryFunction(queryParam, $rootScope.role)
					.then(function(response) {
						scope.isLoading = false;
						scope.graphQueryResults = response.data;

						scope.timeSeries = new MongoTimeSeries(
							response.data,
							queryParam.startDate,
							queryParam.endDate,
							user.tz,
							queryParam.dateGroupBy,
							{fields: fields}
						);
					}).catch(function(error) {
						scope.isLoading = false;
						Notify.alert('Error on query for graph data.');
					});
				};
				// Initial query when loading
				scope.getGraphData(scope.queryParam);
			}
		};
	}
]);