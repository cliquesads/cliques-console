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

    return {
        generateCSVData: generateCSVData,
        getCSVFileName: getCSVFileName,
        formatDatetimeString: formatDatetimeString,
        formCronTaskString: formCronTaskString,
        getAllCountries: getAllCountries,
        getRegions: getRegions,
        queryFunction: queryFunction,
        getQueryTableHeaders: getQueryTableHeaders,
    };
}]);
