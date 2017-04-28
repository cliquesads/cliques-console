/* global _, angular, user */
'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('analytics').factory('Query', ['$resource',
    function($resource) {
        return $resource('console/query/:queryId', { queryId: '@_id'},
            {
                update: { method: 'PATCH'},
                create: { method: 'POST'}
            }
        );
    }
]);

// Export csv transforms object/array to csv data blob
angular.module('analytics').factory('Analytics', [
    '$http', 'HourlyAdStat', 'GeoAdStat', '$filter', 'TABLE_HEADERS',
    function($http, HourlyAdStat, GeoAdStat, $filter, TABLE_HEADERS) {

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
                // delimit commas by surrounding the value with " and "
                if (("" + rowObject[headers[j]]).indexOf(',') !== -1) {
                    rowObject[headers[j]] = "\"" + rowObject[headers[j]] + "\"";
                }

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
    var getAllCountries = function() {
        return $http.get('/console/country');
    };
    var getRegions = function(country) {
        return $http.get('/console/region', {params: {country: country}});
    };
    /**
     * Depending on queryType and different user types(advertiser, publisher or networkAdmin), the query function can be different
     */
    var queryFunction = function(queryType, role) {
        var collection;
        var queryFunction;
        if (queryType !== 'city' && queryType !== 'state' && queryType !== 'country') {
            collection = HourlyAdStat;
        } else {
            collection = GeoAdStat;
        }
        switch (role){
            case 'networkAdmin':
                queryFunction = collection.query;
                break;
            case 'advertiser':
                queryFunction = collection.advSummaryQuery;
                break;
            case 'publisher':
                queryFunction = collection.pubSummaryQuery;
                break;
        }
        return queryFunction;
    };
    var getQueryTableHeaders = function(queryType, dateGroupBy, role, additionalHeaders) {
        var headers = [];
        if (queryType === 'time'){
            headers = [{
                index: 0,
                name: _.capitalize(dateGroupBy),
                type: 'attribute'
            }];
        } else {
            headers = [{
                index: 0,
                name: _.capitalize(queryType),
                type: 'attribute'
            }];
        }
        switch (role){
            case 'networkAdmin':
                headers = headers.concat(TABLE_HEADERS.networkAdmin);
                break;
            case 'advertiser':
                headers = headers.concat(TABLE_HEADERS.advertiser);
                break;
            case 'publisher':
                headers = headers.concat(TABLE_HEADERS.publisher);
                break;
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

    var _getRowTitle = function(row, queryType, dateGroupBy, groupBy){
        var monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        if (queryType === 'time') {
            row[queryType] = row._id.date.month + "/" + row._id.date.day + "/" + row._id.date.year;
            if (dateGroupBy === 'hour') {
                row.Hour = row[queryType] + ' ' + row._id.date.hour + ':00';
            } else if (dateGroupBy === 'day') {
                row.Day = row[queryType];
            } else {
                // date group by month
                row.Month = monthNames[row._id.date.month - 1] + ' ' + row._id.date.year;
            }
        } else if (queryType === 'custom') {
            // TO-DO:::ycx should fill in row[custom] for customized query
        } else {
            var queryTypeHeader = _.capitalize(queryType);
            var val = row._id[queryType];
            if (val){
                // city doesn't get populated, so _id.city == city name
                if (queryType !== 'city'){
                    // otherwise, get name of populated object
                    val = row._id[queryType].name;
                }
            } else {
                // fill blank values
                val = "<No " + queryTypeHeader + " Provided>";
            }
            row[queryTypeHeader] = val;
        }
    };

    var _getRowLogo = function(row, queryType, dateGroupBy, groupBy){
        // Logo for each row
        if (queryType === 'campaign' || queryType === 'creative') {
            row.logo = row._id.advertiser;
            row._logo_type = 'Advertiser';
        } else if (queryType === 'site' || queryType ==='placement') {
            row.logo = row._id.publisher;
            row._logo_type = 'Publisher';
        }
    };

    /**
     * Decide default query table headers based on user/organization type,
     * and also calculate field values for each table row
     */
    var formatQueryTable = function(rows, queryType, dateGroupBy, groupBy) {
        rows.forEach(function(row) {
            _getRowTitle(row, queryType, dateGroupBy, groupBy);
            _getRowLogo(row, queryType, dateGroupBy, groupBy);
            row.Impressions = $filter('number')(row.imps);
            row.Spend = $filter('currency')(row.spend, '$', 2);
            row.CPM = row.imps ? $filter('currency')(row.spend / row.imps * 1000, '$', 2) : '0';
            row.CTR = row.imps ? $filter('percentage')(row.clicks / row.imps, 2): '0';
            row['Total Actions'] = row.view_convs + row.click_convs;
            row.Clicks = $filter('number')(row.imps);
            row.CPC = row.clicks ? $filter('currency')(row.spend / row.clicks, '$', 2) : '0';
            row.Bids = $filter('number')(row.imps);
            row.Revenue = $filter('currency')(row.spend, '$', 2);
            row['View-Through Actions'] = row.view_convs;
            row['Click-Through Actions'] = row.click_convs;
            row.CPAV = row.view_convs ? $filter('currency')(row.spend / row.view_convs, '$', 2) : '0';
            row.CPAC = row.click_convs ? $filter('currency')(row.spend / row.click_convs, '$', 2) : '0';
            row.CPA = (row.view_convs + row.click_convs) ? $filter('currency')(row.spend / (row.view_convs + row.click_convs), '$', 2) : '0';
            row.RPM = row.imps ? $filter('currency')(row.spend / row.imps * 1000, '$', 2) : '0';
            row.Defaults = $filter('number')(row.defaults);
            row.RPAV = row.view_convs ? $filter('currency')(row.spend / row.view_convs, '$', 2) : '0';
            row.RPAC = row.click_convs ? $filter('currency')(row.spend / row.click_convs, '$', 2) : '0';
            row.RPA = (row.view_convs + row.click_convs) ? $filter('currency')(row.spend / (row.view_convs + row.click_convs), '$', 2) : '0';
            row['Fill Rate'] = row.defaults ? $filter('percentage')(row.imps / (row.imps + row.defaults), 2) : '0';
            row.RPC = row.clicks ? $filter('currency')(row.spend / row.clicks, '$', 2) : '0';
            row['Win Rate'] = row.bids ? $filter('percentage')(row.imps / row.bids, 2) : '0';
        });
        return rows;
    };

    return {
        generateCSVData: generateCSVData,
        getCSVFileName: getCSVFileName,
        formatDatetimeString: formatDatetimeString,
        formCronTaskString: formCronTaskString,
        getAllCountries: getAllCountries,
        getRegions: getRegions,
        queryFunction: queryFunction,
        getQueryTableHeaders: getQueryTableHeaders, 
        formatQueryTable: formatQueryTable 
    };
}]);
