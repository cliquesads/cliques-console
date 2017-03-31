/* global _, angular, user */
'use strict';

// Export csv transforms object/array to csv data blob
angular.module('analytics').factory('Analytics', ['$http', function($http) {
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

        var fillRate = function(row) {
            return ((row.imps / (row.imps + row.defaults)) * 100).toFixed(1) + '%';
        };

        var CTR = function(row) {
            return ((row.clicks / row.imps) * 100).toFixed(3) + '%';
        };

        var CPM = function(row) {
            return '$' + ((row.spend / row.imps) * 1000).toFixed(2);
        };

        var formatRow = function(row) {
            row.CPM = CPM(row);
            row.spend = '$' + row.spend.toFixed(2);
            row.fillRate = fillRate(row);
            row.CTR = CTR(row);
            return row;
        };

        var sortByDate = function(a, b) {
            var aDate = new Date(a._id.date.year, a._id.date.month - 1, a._id.date.day);
            var bDate = new Date(b._id.date.year, b._id.date.month - 1, b._id.date.day);
            return aDate - bDate;
        };

        // sort rows by date
        rows = rows.sort(sortByDate);

        // calculate totals, store in separate object
        var totals = {
            imps: _.sumBy(rows, function(r) {
                return r.imps;
            }),
            defaults: _.sumBy(rows, function(r) {
                return r.defaults;
            }),
            spend: _.sumBy(rows, function(r) {
                return r.spend;
            }),
            clicks: _.sumBy(rows, function(r) {
                return r.clicks;
            })
        };
        totals = formatRow(totals);

        // Now calculate derived fields and format (template engine
        // doesn't handle formatting filters)

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            row.date = row._id.date.month + "/" + row._id.date.day + "/" + row._id.date.year;
            if (row._id.placement) {
                row.placement = row._id.placement.name;
            }
            formatRow(row);
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

    return {
        generateCSVData: generateCSVData,
        getCSVFileName: getCSVFileName,
        getRecentQueries: getRecentQueries,
        getMyQueries: getMyQueries,
        formatDatetimeString: formatDatetimeString,
        formCronTaskString: formCronTaskString,
        getAllSites: getAllSites,
        getAllCampaigns: getAllCampaigns
    };
}]);
