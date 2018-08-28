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
    'tableSort',
    'ngDialog',
	function(
		$rootScope,
		Notify,
		aggregationDateRanges,
		Analytics,
		Query,
		tableSort,
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

                scope.pagination = {
                    count: null,
                    pages: null,
                    start: 0,
                    end: 0
                };

                scope.globalSort = $rootScope.globalSort;

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

					if (scope.queryParam.resultsPage){
                        scope.pagination.count = args.count;
                        scope.pagination.pages = args.pages;
                        scope.pagination.start = args.count ? scope.queryParam.perPage * (scope.queryParam.resultsPage - 1) + 1 : 0;
                        scope.pagination.end = args.count ? scope.pagination.start + args.results.length - 1 : 0;
					}


					if (scope.queryParam.type === 'keyword') {
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

				scope.currentSorting = {
                    order: 'desc'
				};
				/**
				 * Sort table by specific column
				 * TODO: bll Should really just handle sorting with lodash `sortBy` function
				 */
				scope.sortTableBy = function(headerName){
					tableSort.sortTableBy(scope.tableQueryResults, headerName, scope.currentSorting);
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
                                var selectedDataHeaders = [];
                                // update related query with updated table data headers
                                parentScope.queryParam.dataHeaders = selectedDataHeaders;
                                $scope.headers.forEach(function(header) {
                                    if (header.selected === true) {
                                        selectedDataHeaders.push(header.name);
                                    }
                                });
								if (parentScope.queryParam._id) {
									// If this query is already saved in database, since now user changed desired table headers to display, this selected additional table headers should also be saved with this query
									new Query(parentScope.queryParam).$update();
								}
								$scope.closeThisDialog(0);
							};
						}]
					});
				};

                /**
				 * Broadcasts event to load new page of query results, passing
				 * desired queryParam changes.
                 */
				scope.loadNewPage = function(page){
					$rootScope.$broadcast("refreshQuery", {
						resultsPage: page
					});
				};
			}
		};
	}
]);