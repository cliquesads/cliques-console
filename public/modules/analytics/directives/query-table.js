/**
 * Created by Chuoxian Yang on 2/4/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('queryTable', [
	'$rootScope',
	'Notify',
	'aggregationDateRanges',
	'Analytics',
	'Query',
    'ngDialog',
	function(
		$rootScope,
		Notify,
		aggregationDateRanges,
		Analytics,
		Query,
		ngDialog
	) {
		'use strict';
		return {
			restrict: 'E',
			scope: {},
			templateUrl: 'modules/analytics/views/partials/query-table.html',
			link: function(scope, element, attrs) {
				// table collapse state
				scope.isCollapsed = false;
			    scope.user = user;
			    scope.isLoading = true;

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
					scope.tableQueryResults = args.results;

					if (scope.queryParam.type === 'keywords') {
						// For keywords query, show keywords as string separated by comma instead of array
						for (var i = 0; i < scope.tableQueryResults.length; i ++) {
							if (scope.tableQueryResults[i].Keywords && 
								scope.tableQueryResults[i].Keywords.constructor === Array) {
								scope.tableQueryResults[i].Keywords = scope.tableQueryResults[i].Keywords.join();
							}
						}
					} 

					// Decide default table headers and format/calculate values for each row
					scope.headers = Analytics.getDefaultDataHeaders(
						scope.queryParam.type,
						scope.queryParam.dateGroupBy,
						$rootScope.role
					);
					scope.headers.forEach(function(header) {
						if (scope.queryParam.dataHeaders.indexOf(header.name) !== -1) {
							header.selected = true;
						}
					});
				});

				/**
				 * Sort table by specific column
				 * TODO: bll Should really just handle sorting with lodash `sortBy` function
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
					var sortByValue = function(a, b) {
						// use _.get to allow headerName to be nested property path
						var aValue = _.get(a, headerName);
						var bValue = _.get(b, headerName);

						if (typeof aValue === 'string' && typeof bValue === 'string') {
							// Remove format characters and convert string to number so as to compare
							aValue = aValue.replace('$', '');
							aValue = aValue.replace('%', '');
							aValue = aValue.replace(/,/g, '');

							bValue = bValue.replace('$', '');
							bValue = bValue.replace('%', '');
							bValue = bValue.replace(/,/g, '');

							// don't coerce to number if string can't be,
							// will just sort alphabetically if still strings
							// TODO: Don't like this, could break any number of ways, not the least of which being
							// TODO: if there are numerical values contained in a string field. Need to refactor
							// TODO: table design to use more robust & canonical table header spec that includes data
							// TODO: types to allow for easier sorting & data manipulation.
							if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))){
								aValue = Number(aValue);
								bValue = Number(bValue);
							}
						}

						var stringSort = function(a, b, order){
							a = a.toUpperCase();
							b = b.toUpperCase();
							var sign = order === 'asc' ? 1: -1;
							if (a < b){
								return sign;
							} else if (a > b){
								return sign * -1;
							} else {
								return 0;
							}
						};

						var numberSort = function(a, b, order){
							if (order === 'asc'){
								return bValue - aValue;
							} else {
								return aValue - bValue;
							}
						};

						return typeof aValue === 'number' ? numberSort(aValue, bValue, scope.currentSorting.order) : stringSort(aValue, bValue, scope.currentSorting.order);
					};
					var sortByDate = function(a, b) {
						var aDate, bDate;
						if (a._id.date.day && a._id.date.hour) {
							aDate = new Date(a._id.date.year, a._id.date.month-1, a._id.date.day, a._id.date.hour, 0, 0);
							bDate = new Date(b._id.date.year, b._id.date.month-1, b._id.date.day, b._id.date.hour, 0, 0);
						} else if (a._id.date.day) {
							aDate = new Date(a._id.date.year, a._id.date.month-1, a._id.date.day);
							bDate = new Date(b._id.date.year, b._id.date.month-1, b._id.date.day);
						} else {
							aDate = new Date(a._id.date.year, a._id.date.month-1);
							bDate = new Date(b._id.date.year, b._id.date.month-1);
						}
						if (scope.currentSorting.order === 'asc') {
							return aDate - bDate;
						} else {
							return bDate - aDate;
						}
					};
					if (scope.currentSorting.orderBy !== 'Hour' &&
						scope.currentSorting.orderBy !== 'Day' &&
						scope.currentSorting.orderBy !== 'Month') {
						scope.tableQueryResults = scope.tableQueryResults.sort(sortByValue);
					} else {
						scope.tableQueryResults = scope.tableQueryResults.sort(sortByDate);
					}
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
						if (header.type === 'attribute' || header.selected === true) {
							csvHeaders.push(header.name);
						}
				    });

				    // download on the frontend
				    var blobStringForCSV = Analytics.generateCSVData(csvHeaders, scope.tableQueryResults);

				    scope.downloadFileName = Analytics.getCSVFileName(scope.queryParam.name);
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
							$scope.toggleDataHeader = function(header) {
								header.selected = !header.selected;
							};
							$scope.updateDataHeaders = function() {
								if (parentScope.queryParam._id) {
									// If this query is already saved in database, since now user changed desired table headers to display, this selected additional table headers should also be saved with this query
									var selectedDataHeaders = [];
									$scope.headers.forEach(function(header) {
										if (header.selected === true) {
											selectedDataHeaders.push(header.name);
										}
									});
									// update related query with updated table data headers
									parentScope.queryParam.dataHeaders = selectedDataHeaders;
									new Query(parentScope.queryParam).$update();
								}
								$scope.closeThisDialog(0);	
							};
						}]
					});
				};
			}
		};
	}
]);