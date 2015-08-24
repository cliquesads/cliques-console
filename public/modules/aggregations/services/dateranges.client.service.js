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
            }
        };
    }
    return getDateRanges;
});
