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
    'ngDialog',
	function(
		$rootScope,
		HourlyAdStat,
		DTOptionsBuilder,
		DTColumnDefBuilder,
		Notify,
		aggregationDateRanges,
		Analytics,
		ngDialog
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
			    // Listen to broadcast to launchQuery
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
						// Decide default table headers and format/calculate values for each row
						var tableHeaders = Analytics.getQueryTableHeaders(scope.queryParam.type);
						scope.headers = tableHeaders.headers;
						scope.additionalHeaders = tableHeaders.additionalHeaders;

						scope.tableQueryResults = Analytics.formatQueryTable(scope.tableQueryResults, scope.headers, scope.queryParam.type, scope.queryParam.groupBy);

						// build datatables options object
						scope.dtOptions = DTOptionsBuilder.newOptions();
						scope.dtOptions.withOption('paging', false);
						scope.dtOptions.withOption('searching', false);
						scope.dtOptions.withOption('scrollX', false); 
						scope.dtOptions.withOption('order', [
							[1, 'desc']
						]);
					})
					.catch(function(error) {
						scope.isLoading = false;
						Notify.alert('Error on query for table data.');
					});
				};
				/************************* EXPORT TO CSV *************************/
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
				    var blobStringForCSV = Analytics.generateCSVData(scope.headers, scope.tableQueryResults);

				    scope.downloadFileName = Analytics.getCSVFileName();
				    scope.downloadFileBlob = new Blob([blobStringForCSV], {
				        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				    });
				};
				/********************** SHOW MORE TABLE FIELDS **********************/
				scope.showMoreTableFields = function() {
					ngDialog.open({
						template: 'modules/analytics/views/partials/more-table-fields.html',
						controller: ['$scope', function($scope) {
							$scope.headers = scope.headers;

							var parentScope = scope;
							$scope.additionalHeaders = scope.additionalHeaders;

							$scope.toggleAdditionalHeader = function(header) {
								parentScope.isLoading = true;
								
								var indexOfHeader = $scope.headers.indexOf(header);
								if (indexOfHeader !== -1) {
									$scope.headers.splice(indexOfHeader, 1);
								} else {
									$scope.headers.push(header);
								}

								parentScope.tableQueryResults = Analytics.formatQueryTable(parentScope.tableQueryResults, parentScope.headers, parentScope.queryParam.type, parentScope.queryParam.groupBy);
								parentScope.isLoading = false;
							};

							$scope.finishedSelectingAdditionalHeaders = function() {
								$scope.closeThisDialog(0);	
							};
						}]
					});
				};

				// Initial query when loading
				scope.getTableData(scope.queryParam);
			}
		};
	}
]);