/* global _, angular, user */
'use strict';

// Export csv transforms object/array to csv data blob
angular.module('analytics').factory('Analytics', ['$http', 'HourlyAdStat', '$filter', 'TABLE_HEADERS', function($http, HourlyAdStat, $filter, TABLE_HEADERS) {
	var getCSVFileName = function(queryName) {
        var asOfDate = moment().tz('America/New_York').startOf('day').subtract(1, 'days').toISOString();
        return queryName + '_' + asOfDate.substring(0, 10) + '_report.csv';
	};
    var generateCSVData = function(headers, rows) {
        var csvString = headers.join(',');
        csvString += '\n';

        // Now calculate derived fields and format (template engine
        // doesn't handle formatting filters)
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];

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
    var saveQuery = function(queryParam) {
        return $http.post('/console/analytics/save', {queryParam: queryParam});
    };
    var saveAdditionalSelectedHeaders = function(selectedAdditionalHeaders, queryId) {
        return $http.post('/console/analytics/saveAdditionalSelectedHeaders', {
            selectedAdditionalHeaders: selectedAdditionalHeaders,
            queryId: queryId
        });
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
    var getQueryTableHeaders = function(queryType, additionalHeaders) {
        var headers = [
            {
                index: 0,
                name: queryType,
                type: 'default'
            }
        ];
        if (user.organization.organization_types.indexOf('networkAdmin') > -1 ||
            user.organization.organization_types.indexOf('advertiser') > -1) {
            headers = headers.concat(TABLE_HEADERS.advertiser);
        } else if (user.organization.organization_types.indexOf('publisher') > -1){
            headers = headers.concat(TABLE_HEADERS.publisher);
        }
        if (additionalHeaders) {
            additionalHeaders.forEach(function(additionalHeader) {
                for (var i = 0; i < headers.length; i ++) {
                    if (headers[i].name === additionalHeader) {
                        headers[i].selected = true;
                    }
                }
            });
        }
        return headers;
    };
    /**
     * Decide default query table headers based on user/organization type,
     * and also calculate field values for each table row
     */
    var formatQueryTable = function(rows, queryType, groupBy) {
        rows.forEach(function(row) {
            if (queryType === 'time') {
                row[queryType] = row._id.date.month + "/" + row._id.date.day + "/" + row._id.date.year;
            } else {
                row[queryType] = row._id[queryType].name;
            }
            // Logo for each row
            if (row._id.advertiser) {
                row.logo = row._id.advertiser.logo_secure_url;
            } else if (row._id.publisher) {
                row.logo = row._id.publisher.logo_secure_url;
            }

            row.Impressions = row.imps;
            row.Spend = $filter('currency')(row.spend, '$', 0);
            row.CPM = row.imps ? $filter('currency')(row.spend / row.imps * 1000, '$', 0) : 'NaN';
            row.CTR = row.imps ? $filter('percentage')(row.clicks / row.imps, 2): 'NaN';
            row['Total Actions'] = row.view_convs + row.click_convs;
            row.Clicks = row.clicks;
            row.CPC = row.clicks ? $filter('currency')(row.spend / row.clicks, '$', 2) : 'NaN';
            row.Bids = row.bids;
            row.Uniques = row.uniques;
            row['View-Through Actions'] = row.view_convs;
            row['Click-Through Actions'] = row.click_convs;
            row.CPAV = row.view_convs ? $filter('currency')(row.spend / row.view_convs, '$', 2) : 'NaN';
            row.CPAC = row.click_convs ? $filter('currency')(row.spend / row.click_convs, '$', 2) : 'NaN';
            row.CPA = (row.view_convs + row.click_convs) ? $filter('currency')(row.spend / (row.view_convs + row.click_convs), '$', 2) : 'NaN';
            row.RPM = row.imps ? row.spend / row.imps * 1000 : 'NaN';
            row.Defaults = row.defaults;
            row.RPAV = row.view_convs ? $filter('currency')(row.spend / row.view_convs, '$', 2) : 'NaN';
            row.RPAC = row.click_convs ? $filter('currency')(row.spend / row.click_convs, '$', 2) : 'NaN';
            row.RPA = (row.view_convs + row.click_convs) ? $filter('currency')(row.spend / (row.view_convs + row.click_convs), '$', 2) : 'NaN';
            row['Fill Rate'] = row.defaults ? row.imps / row.defaults : 'NaN';
            row.RPC = row.clicks ? $filter('currency')(row.spend / row.clicks, '$', 2) : 'NaN';
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
        saveQuery: saveQuery,
        saveAdditionalSelectedHeaders: saveAdditionalSelectedHeaders,
        getAllSites: getAllSites,
        getAllCampaigns: getAllCampaigns,
        queryFunction: queryFunction,
        getQueryTableHeaders: getQueryTableHeaders, 
        formatQueryTable: formatQueryTable 
    };
}]);
