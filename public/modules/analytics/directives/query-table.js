/**
 * Created by Chuoxian Yang on 2/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryTable', [
	'$rootScope',
	'HourlyAdStat',
	'DTOptionsBuilder',
	'DTColumnDefBuilder',
	'Notify',
	function(
		$rootScope,
		HourlyAdStat,
		DTOptionsBuilder,
		DTColumnDefBuilder,
		Notify
	) {
	'use strict';
	return {
		restrict: 'E',
		scope: {

		},
		templateUrl: 'modules/analytics/views/partials/query-table.html',
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
			scope.$on('launchQuery', function(event, args) {
				var queryParam = args.queryParam;
				scope.getTableData(queryParam);
			});
			scope.getTableData = function(queryParam) {
				// query HourlyAdStats endpoint
				scope.queryFunction(queryParam)
				.then(function(response) {
					scope.tableQueryResults = response.data;
					// build datatables options object
					scope.dtOptions = DTOptionsBuilder.newOptions();
					scope.dtOptions.withOption('paging', false);
					scope.dtOptions.withOption('searching', false);
					scope.dtOptions.withOption('scrollX', false); 
					scope.dtOptions.withOption('order', [
						[1, 'desc']
					]);
					scope.dtColumnDefs = [
						DTColumnDefBuilder.newColumnDef(0),
						DTColumnDefBuilder.newColumnDef(1),
						DTColumnDefBuilder.newColumnDef(2),
						DTColumnDefBuilder.newColumnDef(3),
						DTColumnDefBuilder.newColumnDef(4),
						DTColumnDefBuilder.newColumnDef(5)
					];
				})
				.catch(function(error) {
					Notify.alert('Error on query for table data.');
				});
			};
		}
	};
}]);