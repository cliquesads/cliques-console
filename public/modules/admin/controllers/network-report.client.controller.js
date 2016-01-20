/* global _, angular, user */
'use strict';

angular.module('admin').controller('NetworkReportController', ['$scope', '$stateParams', '$location','$templateCache','$compile',
    'Authentication','HourlyAdStat','DTOptionsBuilder', 'DTColumnDefBuilder','DatatableUtils','aggregationDateRanges',
	function($scope, $stateParams, $location, $templateCache, $compile, Authentication, HourlyAdStat, DTOptionsBuilder,
             DTColumnDefBuilder, DatatableUtils,aggregationDateRanges) {
        $scope.authentication = Authentication;
        $scope.dates = {};
        $scope.pubSums = {};
        $scope.advSums = {};
        $scope.dateRanges = aggregationDateRanges(user.tz);
        $scope.range = 'yesterday';

        $scope.footerCallback = function(sumVar,templateId){
            return function (tfoot, data) {
                if (data.length > 0) {
                    // Need to call $apply in order to call the next digest
                    $scope.$apply(function () {
                        $scope[sumVar].spend = _.sumBy(data, function(row){ return Number( row[3].replace(/[^0-9\.]+/g,"")); });
                        $scope[sumVar].imps = _.sumBy(data, function(row){ return Number( row[2].replace(/[^0-9\.]+/g,"")); });
                        $scope[sumVar].fees = _.sumBy(data, function(row){ return Number( row[5].replace(/[^0-9\.]+/g,"")); });
                        $scope[sumVar].gross = _.sumBy(data, function(row){ return Number( row[6].replace(/[^0-9\.]+/g,"")); });
                        var footer = $templateCache.get(templateId),
                            $tfoot = angular.element(tfoot),
                            content = $compile(footer)($scope);
                        $tfoot.html(content);
                    });
                }
            }
        };

        // Bind awful jQuery hack to each table's buttons bar
        $('table[id*=datatable_]').each(function(index,table){
            $(table).on('draw.dt', DatatableUtils.restyleButtonsHack);
        });


        $scope.getStats = function(){
            var custom = ($scope.range === 'custom');
            var startDate = custom ? moment($scope.dates.startDate).tz('UTC').startOf('day').toISOString() : $scope.dateRanges[$scope.range].startDate;
            var endDate = custom ? moment($scope.dates.endDate).tz( 'UTC').add(1,'day').startOf('day').toISOString() : $scope.dateRanges[$scope.range].endDate;
            // query HourlyAdStats api endpoint
            HourlyAdStat.query({
                groupBy: 'publisher',
                populate: 'publisher',
                startDate: startDate,
                endDate: endDate
            }).then(function(response){
                $scope.dtOptions_pub = DTOptionsBuilder.newOptions()
                    .withOption('paging', false)
                    .withOption('searching', false)
                    .withOption('scrollX', true)
                    .withOption('order', [[3,'desc']])
                    .withOption('footerCallback', $scope.footerCallback('pubSums', 'pubTableFooter'))
                    .withButtons(['excel', 'copy','pdf']);
                    // Not entirely sure if this is necessary
                $scope.dtColumnDefs_pub = [
                    DTColumnDefBuilder.newColumnDef(0),
                    DTColumnDefBuilder.newColumnDef(1),
                    DTColumnDefBuilder.newColumnDef(2),
                    DTColumnDefBuilder.newColumnDef(3),
                    DTColumnDefBuilder.newColumnDef(4),
                    DTColumnDefBuilder.newColumnDef(5),
                    DTColumnDefBuilder.newColumnDef(6)
                ];
                $scope.pubData = response.data;
            });

            // query HourlyAdStats api endpoint
            HourlyAdStat.query({
                groupBy: 'advertiser',
                populate: 'advertiser',
                startDate: startDate,
                endDate: endDate
            }).then(function(response){
                $scope.dtOptions_adv = DTOptionsBuilder.newOptions()
                    .withOption('paging', false)
                    .withOption('searching', false)
                    .withOption('scrollX', true)
                    .withOption('order', [[3,'desc']])
                    .withOption('footerCallback', $scope.footerCallback('advSums', 'advTableFooter'))
                    .withButtons(['excel','copy','pdf']);
                // Not entirely sure if this is necessary
                $scope.dtColumnDefs_adv = [
                    DTColumnDefBuilder.newColumnDef(0),
                    DTColumnDefBuilder.newColumnDef(1),
                    DTColumnDefBuilder.newColumnDef(2),
                    DTColumnDefBuilder.newColumnDef(3),
                    DTColumnDefBuilder.newColumnDef(4),
                    DTColumnDefBuilder.newColumnDef(5),
                    DTColumnDefBuilder.newColumnDef(6)
                ];
                $scope.advData = response.data;
            });
        };
	}
]);