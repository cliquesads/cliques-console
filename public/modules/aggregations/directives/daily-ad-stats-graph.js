angular.module('aggregations').directive('dailyAdStatsGraph', ['$timeout',function($timeout){
    'use strict';
    return {
        restrict: 'E',
        scope: {
            showPoints: '=',
            timeSeries: '=',
            height: '@'
        },
        template: '<flot dataset="dataSet" options="graphOptions" callback="callback" height="{{ height }}"></flot>',
        link: function(scope, element, attribute){
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
                        var str = (date.getUTCMonth() + 1).toString() + '/' + date.getUTCDate().toString();
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
                    timeformat: '%m/%d/%y',
                    minTickSize: [1, 'day'],
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
                            barWidth: 24 * 60 * 60 * 600,
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
                            barWidth: 24 * 60 * 60 * 600,
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