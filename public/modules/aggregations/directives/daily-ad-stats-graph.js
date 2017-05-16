angular.module('aggregations').directive('dailyAdStatsGraph', ['$timeout',function($timeout){
    'use strict';
    return {
        restrict: 'E',
        scope: {
            showPoints: '=',
            timeSeries: '=',
            timeUnit: '=',
            height: '@'
        },
        template: '<flot dataset="dataSet" options="graphOptions" callback="callback" height="{{ height }}"></flot>',
        link: function(scope, element, attribute){
            var timeformat, minTickSize;
            // Decide the x-axis time scale depending on differe time unit passed in
            if (!scope.timeUnit || scope.timeUnit === 'day') {
                timeformat = '%m/%d/%y';
                minTickSize = [1, 'day'];
            } else if (scope.timeUnit === 'hour') {
                timeformat = '%m/%d/%y %h:00';
                minTickSize = [1, 'hour'];
            } else if (scope.timeUnit === 'month') {
                timeformat = '%Y/%m';
                minTickSize = [1, 'month'];
            }
            scope.graphOptions = {
                grid: {
                    borderColor: '#eee',
                    borderWidth: 1,
                    hoverable: true,
                    backgroundColor: '#fcfcfc'
                },
                tooltip: true,
                tooltipOpts: {
                    content: function (label, x, y) {
                        var date = new Date(x);
                        var str;

                        var month = date.getUTCMonth() + 1;
                        var day = date.getUTCDate();
                        var hour = date.getUTCHours();

                        var yearStr = date.getUTCFullYear().toString();
                        var monthStr = (month >= 10) ? month.toString() : ('0' + month.toString());
                        var dayStr = (day >= 10) ? day.toString() : ('0' + day.toString());
                        var hourStr = (hour >= 10) ? hour.toString() : ('0' + hour.toString());

                        if (scope.timeUnit === 'hour') {
                            str = monthStr + '/' + dayStr + ' ' + hourStr + ':00';
                        } else if (scope.timeUnit === 'month') {
                            str = yearStr + '/' + monthStr;
                        } else {
                            // timeUnit is day or undefined
                            str = monthStr + '/' + dayStr;
                        }

                        if (label === 'Impressions'){
                            y = y.toLocaleString();
                        } else if (label === 'CTR'){
                            y = (y * 100).toFixed(2) + '%';
                        }
                        return str + ' : ' + y;
                    }
                },
                xaxis: {
                    tickColor: '#fcfcfc',
                    mode: 'time',
                    timezone: 'UTC',
                    timeformat: timeformat,
                    minTickSize: minTickSize,
                    axisLabelPadding: 5
                },
                yaxes: [
                    {
                        position: 'left',
                        tickColor: '#eee',
                        min: 0,
                        tickFormatter: function (val, axis) {
                            return val.toLocaleString();
                        }
                    },
                    {
                        position: 'right',
                        tickColor: '#eee',
                        min: 0,
                        tickFormatter: function (val, axis) {
                            return (val * 100).toFixed(2) + '%';
                        }
                    }
                ],
                shadowSize: 0
            };

            scope.callback = function(plotObj, plotScope){
                // Complete and utter hack.
                // At some point, graph started rendering improperly inside of tabs
                // and I got too impatient to find the root cause of it. It would cause
                // the axes to disappear and the whole grid to render improperly.
                // Pretty sure it happened with release v0.5.0.
                //
                // Basically just destroy and re-render the graph after digest cycle has occurred.
                // TODO: This is deplorable and I'm terribly sorry.  Please fix this when you have time.
                //$timeout(function(){
                //    plotObj.destroy();
                //    $.plot(plotScope.plotArea, plotScope.dataset, plotScope.options);
                //});
            };

            scope.$watchCollection('timeSeries',function(newTimeSeries, oldTimeSeries) {
                if (newTimeSeries){
                    scope.dataSet = [{
                        label: "Impressions",
                        bars: {
                            show: true,
                            align: "center",
                            fill: true,
                            barWidth: scope.timeUnit === 'hour' ? 60 * 60 * 600 : 24 * 60 * 60 * 600,
                            lineWidth: 0.4
                        },
                        color: "#768294",
                        yaxis: 1,
                        data: scope.timeSeries ? scope.timeSeries.imps : null,
                        stack: true
                    },
                    {
                        label: "Defaults",
                        bars: {
                            show: true,
                            align: "center",
                            fill: true,
                            barWidth: scope.timeUnit === 'hour' ? 60 * 60 * 600 : 24 * 60 * 60 * 600,
                            lineWidth: 0.4
                        },
                        color: "#9BE3BF",
                        yaxis: 1,
                        data: scope.timeSeries ? scope.timeSeries.defaults : null,
                        stack: true
                    },
                    {
                        label: "CTR",
                        lines: {
                            show: true,
                            fill: 0.01
                        },
                        points: {
                            show: scope.showPoints,
                            radius: 4
                        },
                        color: "#5ab1ef",
                        yaxis: 2,
                        data: scope.timeSeries ? scope.timeSeries.CTR : null
                    }];
                }
            });
        }
    };
}]);