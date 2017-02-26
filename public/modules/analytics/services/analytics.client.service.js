'use strict';

// Export csv transforms object/array to csv data blob
angular.module('analytics').factory('Analytics', [function() {
	var getCSVFileName = function() {
		return new Date().getTime() + '.csv';
	};
    var generateCSVData = function(data) {
    	data = JSON.parse(data);
        var property, arrayLength, i;

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

        // write fields as the first line
        var blobString = fields.join() + '\n';

        for (i = 0; i < largestArrayLength; i++) {
            var singleRow = [];
            for (property in copy) {
                if (copy.hasOwnProperty(property)) {
                    if (copy[property][i] instanceof Array) {
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
    return {
        generateCSVData: generateCSVData,
        getCSVFileName: getCSVFileName
    };
}]);
