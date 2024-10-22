/* global _, angular, user */
'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('analytics').factory('Query', ['$resource',
    function($resource) {
        return $resource('console/query/:queryId', { queryId: '@_id'},
            {
                update: { method: 'PATCH'},
                create: { method: 'POST'},
                delete: { method: 'DELETE'}
            }
        );
    }
]);

// Export csv transforms object/array to csv data blob
angular.module('analytics').factory('Analytics', [
    '$http', 'HourlyAdStat', 'GeoAdStat', 'KeywordAdStat', '$filter', 'TABLE_HEADERS', 'CRONTAB_DAY_OPTIONS','QUICKQUERIES',
    function($http, HourlyAdStat, GeoAdStat, KeywordAdStat, $filter, TABLE_HEADERS, CRONTAB_DAY_OPTIONS, QUICKQUERIES) {

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
    /**
     * Depending on queryType and different user types(advertiser, publisher or networkAdmin), the query function can be different
     */
    var queryFunction = function(queryType, role) {
        var collection;
        var queryFunction;
        if (queryType === 'keyword') {
            collection = KeywordAdStat;
        } else if (queryType === 'city' || queryType === 'state' || queryType === 'country') {
            collection = GeoAdStat;
        } else {
            collection = HourlyAdStat;
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

    /**
     * Gets headers for a given query, including attribute headers & data headers.
     *
     * The resulting headers array is used to generate the query table. Query data rows
     * are assumed to have each header key as own properties.
     *
     * For most queries, the attribute headers are assumed to be the fields set in each
     * query's `defaultQueryParam.groupBy` param, so this string will be split on commas,
     * capitalized and added as the first N headers in array.
     *
     * The rest of the headers are data headers, and these are stored in TABLE_HEADERS constant.
     *
     * @param queryType key in QUICKQUERIES[role] for query type
     * @param dateGroupBy
     * @param role either 'advertiser', 'publisher' or 'networkAdmin'
     * @returns {Array}
     */
    var getDefaultDataHeaders = function(queryType, dateGroupBy, role) {
        var headers = [];
        if (queryType === 'time'){
            headers = [{
                index: 0,
                name: _.capitalize(dateGroupBy),
                type: 'attribute',
                selected: true
            }];
        } else {
            // get headers from query settings `groupBy` attribute
            // if 'advertiser' or 'publisher' are in the 'groupBy' string they're ignored,
            // as these fields are represented by logos in the queryTable and have a separate
            // template block specifically for logo column.
            var groupBy = QUICKQUERIES[role][queryType].defaultQueryParam.groupBy.split(',');
            if (queryType !== 'state'){
                var h = 0;
                for (var i = 0; i < groupBy.length; i++){
                    if ((groupBy[i] === 'advertiser' && queryType !== 'advertiser') ||
                        (groupBy[i] === 'publisher' && queryType !== 'publisher')){
                        h = i-1;
                        continue;
                    } else {
                        headers.push({
                            index: h,
                            name: _.capitalize(groupBy[i]),
                            type: 'attribute',
                            selected: true
                        });
                    }
                    h += 1;
                }
            } else {
                // state query groupBy is "region" (state is just the display name for
                // cosmetic purposes), so have to handle as a separate case.
                // "State" field is added to result rows server-side (identical vals to "region").
                headers[0] = {
                    index: 0,
                    name: _.capitalize(queryType),
                    type: 'attribute',
                    selected: true
                };
            }
        }

        switch (role){
            case 'networkAdmin':
                headers = headers.concat(angular.copy(TABLE_HEADERS.networkAdmin));
                break;
            case 'advertiser':
                headers = headers.concat(angular.copy(TABLE_HEADERS.advertiser));
                break;
            case 'publisher':
                headers = headers.concat(angular.copy(TABLE_HEADERS.publisher));
                break;
        }
        return headers;
    };
    /**
     * Given user timezone and user input/selection for crontab day, crontab hour, crontab minute and crontab ampm, this function returns the corresponding UTC based crontab string
     */
    var adjustCrontabStringForTimezone = function(crontabDay, crontabHour, crontabMinute, crontabAmPm) {
        if (crontabHour === 12){
            if (crontabAmPm === 'AM'){
                crontabHour = 0;
            }
        } else {
            if (crontabAmPm === 'PM'){
                crontabHour += 12;
            }
        }
        var nowInUserTimzone = moment.tz(user.tz);
        var timezoneOffsetInMinute = moment.tz.zone(user.tz).offset(nowInUserTimzone);

        var scheduledTime = moment.tz(user.tz);
        scheduledTime.minute(crontabMinute);
        scheduledTime.hour(crontabHour);

        var tempDate = scheduledTime.day();

        scheduledTime.add(timezoneOffsetInMinute, 'minutes');

        crontabHour = scheduledTime.hour();
        crontabMinute = scheduledTime.minute();

        var dayOffset = scheduledTime.day() - tempDate;
        if (dayOffset !== 0) {
            switch (crontabDay) {
                case CRONTAB_DAY_OPTIONS['Every week day']:
                    crontabDay = (dayOffset === 1 ? ' * * 2-6' : ' * * 0-4');
                    break;
                case CRONTAB_DAY_OPTIONS['The 1st of each month']:
                    crontabDay = (dayOffset === 1 ? ' 2 * *' : ' 28 * *');
                    break;
                case CRONTAB_DAY_OPTIONS['The last day of each month']:
                    crontabDay = (dayOffset === 1 ? ' 1 * *' : ' 27 * *');
                    break;
                case CRONTAB_DAY_OPTIONS['Every Monday']:
                    crontabDay = (dayOffset === 1 ? ' * * 2' : ' * * 7');
                    break;
                case CRONTAB_DAY_OPTIONS['Every Tuesday']:
                    crontabDay = (dayOffset === 1 ? ' * * 3' : ' * * 1');
                    break;
                case CRONTAB_DAY_OPTIONS['Every Wednesday']:
                    crontabDay = (dayOffset === 1 ? ' * * 4' : ' * * 2');
                    break;
                case CRONTAB_DAY_OPTIONS['Every Thursday']:
                    crontabDay = (dayOffset === 1 ? ' * * 5' : ' * * 3');
                    break;
                case CRONTAB_DAY_OPTIONS['Every Friday']:
                    crontabDay = (dayOffset === 1 ? ' * * 6' : ' * * 4');
                    break;
                case CRONTAB_DAY_OPTIONS['Every Saturday']:
                    crontabDay = (dayOffset === 1 ? ' * * 7' : ' * * 5');
                    break;
                case CRONTAB_DAY_OPTIONS['Every Sunday']:
                    crontabDay = (dayOffset === 1 ? ' * * 1' : ' * * 6');
                    break;
                default:
                    break;
            }
        }
        return crontabMinute + ' ' + crontabHour + crontabDay;
    };

    /**
     * Given an UTC based crontab string, this function extracts the crontab day option, hour, minute, ampm value by adding/subtracting the user timezone offset
     */
    var translateCrontabString = function(crontabString) {
        var crontabHour, crontabDay, crontabMinute;
        var crontabAmPm = 'AM';
        var arr = crontabString.split(' '); 
        crontabMinute = arr[0];
        crontabHour = arr[1];
        crontabDay = ' ' + arr[2] + ' ' + arr[3] + ' ' + arr[4];

        var nowInUserTimzone = moment.tz(user.tz);
        var timezoneOffsetInMinute = moment.tz.zone(user.tz).offset(nowInUserTimzone);

        var scheduledTime = moment.tz(user.tz);
        scheduledTime.minute(crontabMinute);
        scheduledTime.hour(crontabHour);

        var tempDate = scheduledTime.day();

        scheduledTime.subtract(timezoneOffsetInMinute, 'minutes');

        crontabHour = scheduledTime.hour();
        crontabMinute = scheduledTime.minute();

        var dayOffset = tempDate - scheduledTime.day();
        if (dayOffset !== 0) {
            switch (crontabDay) {
                case ' * * 2-6':
                case ' * * 0-4':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every week day'];
                    break;
                case ' 2 * *':
                case ' 28 * *':
                    crontabDay = CRONTAB_DAY_OPTIONS['The 1st of each month'];
                    break;
                case ' 1 * *':
                case ' 27 * *':
                    crontabDay = CRONTAB_DAY_OPTIONS['The last day of each month'];
                    break;
                case ' * * 2':
                case ' * * 7':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every Monday'];
                    break;
                case ' * * 3':
                case ' * * 1':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every Tuesday'];
                    break;
                case ' * * 4':
                case ' * * 2':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every Wednesday'];
                    break;
                case ' * * 5':
                case ' * * 3':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every Thursday'];
                    break;
                case ' * * 6':
                case ' * * 4':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every Friday'];
                    break;
                case ' * * 7':
                case ' * * 5':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every Saturday'];
                    break;
                case ' * * 1':
                case ' * * 6':
                    crontabDay = CRONTAB_DAY_OPTIONS['Every Sunday'];
                    break;
                default:
                    break;
            }
        }
        if (crontabHour > 12) {
            crontabHour -= 12;
            crontabAmPm = 'PM';
        }
        return {
            crontabHour: crontabHour,
            crontabMinute: crontabMinute,
            crontabAmPm: crontabAmPm,
            crontabDay: crontabDay
        };
    };

    return {
        generateCSVData: generateCSVData,
        getCSVFileName: getCSVFileName,
        formatDatetimeString: formatDatetimeString,
        formCronTaskString: formCronTaskString,
        queryFunction: queryFunction,
        getDefaultDataHeaders: getDefaultDataHeaders,
        adjustCrontabStringForTimezone: adjustCrontabStringForTimezone,
        translateCrontabString: translateCrontabString
    };
}]);
