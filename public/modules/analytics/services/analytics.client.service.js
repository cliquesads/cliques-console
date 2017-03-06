'use strict';

// Export csv transforms object/array to csv data blob
angular.module('analytics').factory('Analytics', ['$http', function($http) {
	var getCSVFileName = function() {
		return new Date().getTime() + '.csv';
	};
    var generateCSVData = function(data) {
    	data = JSON.parse(data);
        var property, arrayLength, i;

        /**
         * Clone a new object with the given object data so the original object data won't get modified
         */
        function clone(obj) {
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
        }

        var copy = clone(data);
        /* flatten the object, that is to extract the nested object to the first hierachy of the object, for instance, an object with this structure:
        {
            'a': {
                foo: 1,
                bar: 2
            },
            'b': 'hello'
        }
        becomes:
        {
            'a/foo': 1,
            'a/bar': 2,
            'b': 'hello'
        }
        */
        for (property in copy) {
            if (copy.hasOwnProperty(property)) {
                if (copy[property] instanceof Object && !(copy[property] instanceof Array)) {
                    for (var p in copy[property]) {
                        if (copy[property].hasOwnProperty(p)) {
                            copy[property + '/' + p] = copy[property][p];
                        }
                    }
                    delete copy[property];
                }
            }
        }

        var largestArrayLength = 0;
        var fields = [];
        for (property in copy) {
            if (copy.hasOwnProperty(property)) {
                fields.push(property);
                if (copy[property] instanceof Array) {
                    arrayLength = copy[property].length;
                    if (arrayLength > largestArrayLength) {
                        largestArrayLength = arrayLength;
                    }
                }
            }
        }

        for (property in copy) {
            if (typeof copy[property] === 'string' || copy[property] instanceof String) {
                copy[property] = [copy[property]];
                for (i = 1; i < largestArrayLength; i++) {
                    copy[property].push("");
                }
            } else if (copy[property] instanceof Array && copy[property].length < largestArrayLength) {
                arrayLength = copy[property].length;
                for (i = arrayLength; i < largestArrayLength; i++) {
                    copy[property].push("");
                }
            }
        }

        // write fields/column name as the first line
        var blobString = fields.join() + '\n';

        for (i = 0; i < largestArrayLength; i++) {
            var singleRow = [];
            for (property in copy) {
                if (copy.hasOwnProperty(property)) {
                    if (copy[property][i] instanceof Array) {
                        // Check if the array element has the format:
                        // [1488240000000, 0], if so convert the timestamp to human readable datetime format
                        if (copy[property][i].length === 2) {
                            var datetime = new Date(copy[property][i][0]);
                            if (datetime) {
                                copy[property][i][0] = datetime.toISOString();
                            }
                        }
                        singleRow.push(copy[property][i].join('/'));
                    } else {
                        singleRow.push(copy[property][i]);
                    }
                }
            }
            blobString += singleRow.join() + '\n';
        }
        return blobString;
    };
    var getRecentQueries = function() {
        return $http.get('/console/analytics/recentQueries');
    };
    var getMyQueries = function() {
        return $http.get('/console/analytics/customQueries');
    };
    var formatDatetimeString = function(datetimeString) {
        var datetime = new Date(datetimeString);
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var month = months[datetime.getMonth()];
        var date = datetime.getDate();
        var year = datetime.getFullYear();
        var hour = datetime.getHours();
        var minute = datetime.getMinutes();
        var ampm = hour < 12 ? "AM" : "PM";
        var timezoneAbbr = datetime.toLocaleTimeString('en-us',{timeZoneName:'short'}).split(' ')[2]
        return month + " " + date + " " + year + " " + hour + ":" + minute + ampm + " " + timezoneAbbr; 
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
    return {
        generateCSVData: generateCSVData,
        getCSVFileName: getCSVFileName,
        getRecentQueries: getRecentQueries,
        getMyQueries: getMyQueries,
        formatDatetimeString: formatDatetimeString,
        formCronTaskString: formCronTaskString
    };
}]);
