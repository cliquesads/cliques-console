/* global _, angular, moment */
'use strict';

angular.module('aggregations').factory('aggregationDateRanges',function(){
    function getDateRanges(timezone){
        return {
            "7d": {
                startDate: moment().tz(timezone).add(1,'days').startOf('day').subtract(6, 'days').toISOString(),
                endDate: moment().tz(timezone).add(1,'days').startOf('day').toISOString(),
                label: "Last 7 Days",
                showPoints: true // Used for graphing purposes, might not be generic enough to keep in here
            },
            "30d": {
                startDate: moment().tz(timezone).add(1,'days').startOf('day').subtract(29, 'days').toISOString(),
                endDate: moment().tz(timezone).add(1,'days').startOf('day').toISOString(),
                label: "Last 30 Days",
                showPoints: false // Used for graphing purposes, might not be generic enough to keep in here
            },
            "90d": {
                startDate: moment().tz(timezone).add(1,'days').startOf('day').subtract(89, 'days').toISOString(),
                endDate: moment().tz(timezone).add(1,'days').startOf('day').toISOString(),
                label: "Last 90 Days",
                showPoints: false // Used for graphing purposes, might not be generic enough to keep in here
            },
            "lastMonth":{
                startDate: moment().tz(timezone).subtract(1,'months').startOf('month').toISOString(),
                endDate: moment().tz(timezone).startOf('month').startOf('day').toISOString(),
                label: "Last Month",
                showPoints: false
            },
            "mtd":{
                startDate: moment().tz(timezone).startOf('month').startOf('day').toISOString(),
                endDate: moment().tz(timezone).add(1,'days').startOf('day').toISOString(),
                label: "Month to Date",
                showPoints: false
            },
            "ytd":{
                startDate: moment().tz(timezone).startOf('year').startOf('day').toISOString(),
                endDate: moment().tz(timezone).add(1,'days').startOf('day').toISOString(),
                label: "Year to Date",
                showPoints: false
            },
            "yesterday":{
                startDate: moment().tz(timezone).subtract(1,'days').startOf('day').toISOString(),
                endDate: moment().tz(timezone).startOf('day').toISOString(),
                label: "Yesterday",
                showPoints: false
            },
            "today":{
                startDate: moment().tz(timezone).startOf('day').toISOString(),
                endDate: moment().tz(timezone).add(1,'days').startOf('day').toISOString(),
                label: "Today",
                showPoints: false
            },
            "custom": {
                startDate: null,
                endDate: null,
                label: "Custom...",
                showPoints: false
            }
        };
    }
    return getDateRanges;
});
