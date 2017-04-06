/* global _, angular, user */
'use strict';

// Export csv transforms object/array to csv data blob
angular.module('analytics').factory('Analytics', ['$http', 'HourlyAdStat', '$filter', 'TABLE_HEADERS', function($http, HourlyAdStat, $filter, TABLE_HEADERS) {
	var getCSVFileName = function() {
        var asOfDate = moment().tz('America/New_York').startOf('day').subtract(1, 'days').toISOString();
        return asOfDate + '_report.csv';
	};
    var generateCSVData = function(headers, data) {
        /**
         * Clone a new object with the given object data so the original object data won't get modified
         */
        var clone = function(obj) {
            var copy;
            // Handle the 3 simple types, and null or undefined
            if (null === obj || "object" !== typeof obj) return obj;
            // Handle Date
            if (obj instanceof Date) {
                copy = new Date();
                copy.setTime(obj.getTime());
                return copy;
            }
            // Handle Array
            if (obj instanceof Array) {
                copy = [];
                for (var i = 0, len = obj.length; i < len; i++) {
                    copy[i] = clone(obj[i]);
                }
                return copy;
            }
            // Handle Object
            if (obj instanceof Object) {
                copy = {};
                for (var attr in obj) {
                    if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
                }
                return copy;
            }
            throw new Error("Unable to copy obj! Its type isn't supported.");
        };
        var rows = clone(data);

        var csvString = headers.join(',');
        csvString += '\n';

        var sortByDate = function(a, b) {
            var aDate = new Date(a._id.date.year, a._id.date.month - 1, a._id.date.day);
            var bDate = new Date(b._id.date.year, b._id.date.month - 1, b._id.date.day);
            return aDate - bDate;
        };

        // sort rows by date
        rows = rows.sort(sortByDate);

        // Now calculate derived fields and format (template engine
        // doesn't handle formatting filters)

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            row.Time = row._id.date.month + "/" + row._id.date.day + "/" + row._id.date.year;

            // write to csv as well, only picking headers passed in
            var rowObject = _.pick(row, headers);
            var csvRow = '';
            for (var j = 0; j < headers.length; j ++) {
                if (j < headers.length - 1) {
                    csvRow += (rowObject[headers[j]] || rowObject[headers[j]] === 0) ? (rowObject[headers[j]] + ',') : ',';
                } else {
                    csvRow += (rowObject[headers[j]] || rowObject[headers[j]] === 0) ? (rowObject[headers[j]] + '\n') : '\n';
                }
            }
            csvString += csvRow;
        }
        return csvString;
    };
    var getRecentQueries = function(currentPage) {
        if (!currentPage) {
            currentPage = 1;
        }
        return $http.get('/console/analytics/recentQueries?currentPage=' + currentPage);
    };
    var getMyQueries = function(currentPage) {
        if (!currentPage) {
            currentPage = 1;
        }
        return $http.get('/console/analytics/customQueries?currentPage=' + currentPage);
    };
    var formatDatetimeString = function(datetimeString) {
        var dateMoment = moment(datetimeString);
        return dateMoment.format('MMM DD YYYY h:mmA ') + dateMoment.tz(user.tz).format('z');
    };
    // function to form cron task string based on user input of scheduler directive
    var formCronTaskString = function(cronScheduleParam) {
        var secondPos = 0,
            minutePos = 0,
            hourPos = 0,
            datePos = '*',
            monthPos = '*',
            weekdayPos = '*';
        if (cronScheduleParam.second) {
            secondPos = cronScheduleParam.second;
        }
        if (cronScheduleParam.minute) {
            minutePos = cronScheduleParam.minute;
        }
        if (cronScheduleParam.hour) {
            hourPos = cronScheduleParam.hour;
        }
        if (cronScheduleParam.date) {
            datePos = cronScheduleParam.date;
        }
        if (cronScheduleParam.month) {
            monthPos = cronScheduleParam.month.value;
        }
        if (cronScheduleParam.weekday) {
            weekdayPos = cronScheduleParam.weekday.value;
        }
        var cronString = '' + secondPos + ' ' + minutePos + ' ' + hourPos + ' ' + datePos + ' ' + monthPos + ' ' + weekdayPos;
        return cronString;
    };
    var getAllSites = function() {
        return $http.get('/console/analytics/getAllSites');
    };
    var getAllCampaigns = function() {
        return $http.get('/console/analytics/getAllCampaigns');
    };
    var queryFunction = function() {
        var queryFunction;
        /**
         * Depending on different user types(advertiser, publisher or networkAdmin), the query function can be different
         */
        if (user) {
            if (user.organization.organization_types.indexOf('networkAdmin') > -1){
                queryFunction = HourlyAdStat.query;
            } else if (user.organization.organization_types.indexOf('advertiser') > -1){
                queryFunction = HourlyAdStat.advSummaryQuery;
            } else if (user.organization.organization_types.indexOf('publisher') > -1){
                queryFunction = HourlyAdStat.pubSummaryQuery;
            }
        }
        return queryFunction;
    };
    var getQueryTableHeaders = function(queryType) {
        var headers = [queryType];
        var additionalHeaders;
        if (user.organization.organization_types.indexOf('networkAdmin') > -1 ||
            user.organization.organization_types.indexOf('advertiser') > -1) {
            headers = headers.concat(TABLE_HEADERS['Default Advertiser Metrics']);
            additionalHeaders = TABLE_HEADERS['Additional Advertiser Metrics'];
        } else if (user.organization.organization_types.indexOf('publisher') > -1){
            headers = headers.concat(TABLE_HEADERS['Default Publisher Metrics']);
            additionalHeaders = TABLE_HEADERS['Additional Publisher Metrics'];
        }
        return {
            headers: headers,
            additionalHeaders: additionalHeaders
        };
    };
    /**
     * Decide default query table headers based on user/organization type,
     * and also calculate field values for each table row
     */
    var formatQueryTable = function(rows, headers, queryType, groupBy) {
        rows.forEach(function(row) {
            row[queryType] = row._id[groupBy];

            if (headers.indexOf('Impressions') !== -1) {
                row.Impressions = $filter('number')(row.imps, 0);
            }
            if (headers.indexOf('Spend') !== -1) {
                row.Spend = $filter('currency')(row.spend, '$', 0);
            }
            if (headers.indexOf('CPM') !== -1) {
                row.CPM = row.imps ? $filter('currency')(row.spend / row.imps * 1000, '$', 0) : 'NaN';
            }
            if (headers.indexOf('CTR') !== -1) {
                row.CTR = row.imps ? $filter('percentage')(row.clicks / row.imps, 2): 'NaN';
            }
            if (headers.indexOf('Total Actions') !== -1) {
                row['Total Actions'] = $filter('number')(row.view_convs + row.click_convs, 0);
            }
            if (headers.indexOf('Clicks') !== -1) {
                row.Clicks = row.clicks;
            }
            if (headers.indexOf('CPC') !== -1) {
                row.CPC = row.clicks ? $filter('currency')(row.spend / row.clicks, '$', 2) : 'NaN';
            }
            if (headers.indexOf('Bids') !== -1) {
                row.Bids = row.bids;
            }
            if (headers.indexOf('Uniques') !== -1) {
                row.Uniques = row.uniques;
            }
            if (headers.indexOf('View-Through Actions') !== -1) {
                row['View-Through Actions'] = $filter('number')(row.view_convs, 0);
            }
            if (headers.indexOf('Click-Through Actions') !== -1) {
                row['Click-Through Actions'] = $filter('number')(row.click_convs, 0);
            }
            if (headers.indexOf('CPAV') !== -1) {
                row.CPAV = row.view_convs ? $filter('currency')(row.spend / row.view_convs, '$', 2) : 'NaN';
            }
            if (headers.indexOf('CPAC') !== -1) {
                row.CPAC = row.click_convs ? $filter('currency')(row.spend / row.click_convs, '$', 2) : 'NaN';
            }
            if (headers.indexOf('CPA') !== -1) {
                row.CPA = (row.view_convs + row.click_convs) ? $filter('currency')(row.spend / (row.view_convs + row.click_convs), '$', 2) : 'NaN';
            }
            if (headers.indexOf('RPM') !== -1) {
                row.RPM = row.imps ? row.spend / row.imps * 1000 : 'NaN';
            }
            if (headers.indexOf('Defaults') !== -1) {
                row.Defaults = row.defaults;
            }
            if (headers.indexOf('RPAV') !== -1) {
                row.RPAV = row.view_convs ? $filter('currency')(row.spend / row.view_convs, '$', 2) : 'NaN';
            }
            if (headers.indexOf('RPAC') !== -1) {
                row.RPAC = row.click_convs ? $filter('currency')(row.spend / row.click_convs, '$', 2) : 'NaN';
            }
            if (headers.indexOf('RPA') !== -1) {
                row.RPA = (row.view_convs + row.click_convs) ? $filter('currency')(row.spend / (row.view_convs + row.click_convs), '$', 2) : 'NaN';
            }
            if (headers.indexOf('Fill Rate') !== -1) {
                row['Fill Rate'] = row.defaults ? row.imps / row.defaults : 'NaN';
            }
            if (headers.indexOf('RPC') !== -1) {
                row.RPC = row.clicks ? $filter('currency')(row.spend / row.clicks, '$', 2) : 'NaN';
            }
        });
        return rows;
    };

    return {
        generateCSVData: generateCSVData,
        getCSVFileName: getCSVFileName,
        getRecentQueries: getRecentQueries,
        getMyQueries: getMyQueries,
        formatDatetimeString: formatDatetimeString,
        formCronTaskString: formCronTaskString,
        getAllSites: getAllSites,
        getAllCampaigns: getAllCampaigns,
        queryFunction: queryFunction,
        getQueryTableHeaders: getQueryTableHeaders, 
        formatQueryTable: formatQueryTable 
    };
}]);
