/* global _, angular, user */
'use strict';

angular.module('admin').controller('AdminController', ['$scope', '$stateParams', '$location','$templateCache','$compile',
    'Authentication','HourlyAdStat','DTOptionsBuilder', 'DTColumnDefBuilder',
	function($scope, $stateParams, $location, $templateCache, $compile, Authentication, HourlyAdStat, DTOptionsBuilder, DTColumnDefBuilder) {
        $scope.authentication = Authentication;
        $scope.dates = {};
        $scope.pubSums = {};
        $scope.advSums = {};

        $scope.footerCallback = function(sumVar, templateId){
            return function (tfoot, data) {
                if (data.length > 0) {
                    // Need to call $apply in order to call the next digest
                    $scope.$apply(function () {
                        $scope[sumVar].spend = _.sum(data, function(row){ return Number( row[3].replace(/[^0-9\.]+/g,"")); });
                        $scope[sumVar].imps = _.sum(data, function(row){ return Number( row[2].replace(/[^0-9\.]+/g,"")); });
                        $scope[sumVar].fees = _.sum(data, function(row){ return Number( row[6].replace(/[^0-9\.]+/g,"")); });
                        $scope[sumVar].gross = _.sum(data, function(row){ return Number( row[7].replace(/[^0-9\.]+/g,"")); });
                        var footer = $templateCache.get(templateId),
                            $tfoot = angular.element(tfoot),
                            content = $compile(footer)($scope);
                        $tfoot.html(content);
                    });
                }
            }
        };

        $scope.getStats = function(){
            var startDate = moment($scope.dates.startDate).tz('UTC').startOf('day').toISOString();
            var endDate = moment($scope.dates.endDate).tz( 'UTC').endOf('day').toISOString();
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
                    .withButtons(['excel', 'copy'])
                    .withBootstrap();
                    // Not entirely sure if this is necessary
                $scope.dtColumnDefs_pub = [
                    DTColumnDefBuilder.newColumnDef(0),
                    DTColumnDefBuilder.newColumnDef(1),
                    DTColumnDefBuilder.newColumnDef(2),
                    DTColumnDefBuilder.newColumnDef(3),
                    DTColumnDefBuilder.newColumnDef(4),
                    DTColumnDefBuilder.newColumnDef(5),
                    DTColumnDefBuilder.newColumnDef(6),
                    DTColumnDefBuilder.newColumnDef(7)
                    //DTColumnDefBuilder.newColumnDef(8)
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
                $scope.dtOptions_adv = DTOptionsBuilder.newOptions();
                $scope.dtOptions_adv.withOption('paging', false);
                $scope.dtOptions_adv.withOption('searching', false);
                $scope.dtOptions_adv.withOption('scrollX', true);
                $scope.dtOptions_adv.withOption('order', [[3,'desc']]);
                $scope.dtOptions_adv.withOption('footerCallback', $scope.footerCallback('advSums', 'advTableFooter'));
                // Not entirely sure if this is necessary
                $scope.dtColumnDefs_adv = [
                    DTColumnDefBuilder.newColumnDef(0),
                    DTColumnDefBuilder.newColumnDef(1),
                    DTColumnDefBuilder.newColumnDef(2),
                    DTColumnDefBuilder.newColumnDef(3),
                    DTColumnDefBuilder.newColumnDef(4),
                    DTColumnDefBuilder.newColumnDef(5),
                    DTColumnDefBuilder.newColumnDef(6),
                    DTColumnDefBuilder.newColumnDef(7)
                    //DTColumnDefBuilder.newColumnDef(8)
                ];
                $scope.advData = response.data;
            });
        };
	}
]);