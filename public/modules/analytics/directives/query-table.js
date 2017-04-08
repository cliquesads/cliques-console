/**
 * Created by Chuoxian Yang on 2/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryTable', [
	'$rootScope',
	'HourlyAdStat',
	'Notify',
	'aggregationDateRanges',
	'Analytics',
    'ngDialog',
	function(
		$rootScope,
		HourlyAdStat,
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
				// Listen to broadcast message when query is saved to the backend
				scope.$on('querySaved', function(event, args) {
					scope.savedQueryId = args.savedQueryId;
				});
				/**
				 * Make query and display query results
				 */
				scope.getTableData = function(queryParam) {
					scope.isLoading = true;
					scope.humanizedDateRange = queryParam.humanizedDateRange;
					// query HourlyAdStats endpoint
					scope.queryFunction(queryParam)
					.then(function(response) {
						scope.isLoading = false;

						// sort rows by date
						scope.tableQueryResults = response.data.sort(function(a, b) {
						    var aDate = new Date(a._id.date.year, a._id.date.month - 1, a._id.date.day);
						    var bDate = new Date(b._id.date.year, b._id.date.month - 1, b._id.date.day);
						    return aDate - bDate;
						});

						// Decide default table headers and format/calculate values for each row
						scope.headers = Analytics.getQueryTableHeaders(scope.queryParam.type);

						scope.tableQueryResults = Analytics.formatQueryTable(scope.tableQueryResults, scope.queryParam.type, scope.queryParam.groupBy);
					})
					.catch(function(error) {
						scope.isLoading = false;
						Notify.alert('Error on query for table data.');
					});
				};
				/**
				 * Sort table by specific column
				 */
				scope.sortTableBy = function(headerName) {
					if (!scope.currentSorting) {
						scope.currentSorting = {
							orderBy: headerName,
							order: 'desc'
						};
					} else {
						if (scope.currentSorting.orderBy !== headerName) {
							scope.currentSorting = {
								orderBy: headerName,
								order: 'desc'
							};
						} else {
							if (scope.currentSorting.order === 'asc') {
								scope.currentSorting.order = 'desc';
							} else {
								scope.currentSorting.order = 'asc';
							}
						}
					}

					var sortBy = function(a, b) {
						var aValue = a[headerName];
						var bValue = b[headerName];

						if (typeof aValue === 'string' && typeof bValue === 'string') {
							// Remove format characters and convert string to number so as to compare
							aValue = aValue.replace('$', '');
							aValue = aValue.replace('%', '');

							bValue = bValue.replace('$', '');
							bValue = bValue.replace('%', '');

							aValue = Number(aValue);
							bValue = Number(bValue);
						}

						if (scope.currentSorting.order === 'asc') {
							return aValue - bValue;
						} else {
							return bValue - aValue;
						}
					};
					scope.tableQueryResults = scope.tableQueryResults.sort(sortBy);
				};
				/**
				 * Export to CSV
				 */
				scope.exportToCSV = function() {
				    // Check if there are data to be exported
				    if (!scope.tableQueryResults) {
				        Notify.alert('No data to export');
				        return; 
				    } else if (scope.tableQueryResults.length === 0) {
				        Notify.alert('No data to export');
				        return;
				    }

				    var csvHeaders = [];
				    scope.headers.forEach(function(header) {
						if (header.type === 'default' || header.selected === true) {
							csvHeaders.push(header.name);
						}
				    });

				    // download on the frontend
				    var blobStringForCSV = Analytics.generateCSVData(csvHeaders, scope.tableQueryResults);

				    scope.downloadFileName = Analytics.getCSVFileName();
				    scope.downloadFileBlob = new Blob([blobStringForCSV], {
				        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				    });
				};
				/**
				 * Allows user to select additional table fields
				 */
				scope.showMoreTableFields = function() {
					ngDialog.open({
						template: 'modules/analytics/views/partials/more-table-fields.html',
						controller: ['$scope', function($scope) {
							$scope.headers = scope.headers;
							var parentScope = scope;
							$scope.toggleAdditionalHeader = function(header) {
								header.selected = !header.selected;
							};
							$scope.finishedSelectingAdditionalHeaders = function() {
								if (parentScope.savedQueryId) {
									// If this query is already saved in database, since now user changed desired table headers to display, this selected additional table headers should also be saved with this query
									var selectedAdditionalHeaders = [];
									$scope.headers.forEach(function(header) {
										if (header.selected === true) {
											selectedAdditionalHeaders.push(header.name);
										}
									});
									Analytics.saveAdditionalSelectedHeaders(selectedAdditionalHeaders, parentScope.savedQueryId);
								}
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