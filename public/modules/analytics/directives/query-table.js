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
	'aggregationDateRanges',
	'Analytics',
	function(
		$rootScope,
		HourlyAdStat,
		DTOptionsBuilder,
		DTColumnDefBuilder,
		Notify,
		aggregationDateRanges,
		Analytics
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {
				defaultQueryParam: '='
			},
			templateUrl: 'modules/analytics/views/partials/query-table.html',
			link: function(scope, element, attrs) {
				scope.queryParam = scope.defaultQueryParam;
				// table collapse state
				scope.isCollapsed = false;
			    scope.user = user;
			    scope.queryFunction = Analytics.queryFunction();
				scope.$on('launchQuery', function(event, args) {
					scope.queryParam = args.queryParam;
					scope.getTableData(scope.queryParam);
				});
				scope.getTableData = function(queryParam) {
					scope.isLoading = true;
					scope.humanizedDateRange = queryParam.humanizedDateRange;
					// query HourlyAdStats endpoint
					scope.queryFunction(queryParam)
					.then(function(response) {
						scope.isLoading = false;
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
						scope.isLoading = false;

						Notify.alert('Error on query for table data.');
					});
				};
				/**************************** EXPORT TO CSV ****************************/
				scope.exportToCSV = function() {
				    // Check if there are data to be exported
				    if (!scope.tableQueryResults) {
				        Notify.alert('No data to export');
				        return; 
				    } else if (scope.tableQueryResults.length === 0) {
				        Notify.alert('No data to export');
				        return;
				    }
				    // download on the frontend
				    var blobStringForCSV = Analytics.generateCSVData(['date', 'placement', 'spend', 'imps', 'clicks', 'fillRate', 'CTR', 'CPM'], scope.tableQueryResults);

				    scope.downloadFileName = Analytics.getCSVFileName();
				    scope.downloadFileBlob = new Blob([blobStringForCSV], {
				        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				    });
				};
				scope.getTableData(scope.queryParam);
			}
		};
	}
]);