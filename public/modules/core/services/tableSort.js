/**
 * Sort table by specific column
 * TODO: bll Should really just handle sorting with lodash `sortBy` function
 */
angular.module('core').service('tableSort', function() {
    return {
        /**
         * Predicate for sorting rows by value for Numbers, Strings & Numbers as Strings.
         * Will try to coerce Numbers formatted as Strings to Numbers, and will otherwise
         * sort based on type value.
         *
         * @param headerName
         * @param order
         * @returns {Function}
         */
        sortByValue: function(headerName, order) {
            return function (a, b) {
                // use _.get to allow headerName to be nested property path
                var aValue = _.get(a, headerName);
                var bValue = _.get(b, headerName);

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    // Remove format characters and convert string to number so as to compare
                    aValue = aValue.replace('$', '');
                    aValue = aValue.replace('%', '');
                    aValue = aValue.replace(/,/g, '');

                    bValue = bValue.replace('$', '');
                    bValue = bValue.replace('%', '');
                    bValue = bValue.replace(/,/g, '');

                    // don't coerce to number if string can't be,
                    // will just sort alphabetically if still strings
                    // TODO: Don't like this, could break any number of ways, not the least of which being
                    // TODO: if there are numerical values contained in a string field. Need to refactor
                    // TODO: table design to use more robust & canonical table header spec that includes data
                    // TODO: types to allow for easier sorting & data manipulation.
                    if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
                        aValue = Number(aValue);
                        bValue = Number(bValue);
                    }
                }

                var stringSort = function (a, b, order) {
                    a = a.toUpperCase();
                    b = b.toUpperCase();
                    var sign = order === 'asc' ? 1 : -1;
                    if (a < b) {
                        return sign;
                    } else if (a > b) {
                        return sign * -1;
                    } else {
                        return 0;
                    }
                };

                var numberSort = function (a, b, order) {
                    if (order === 'asc') {
                        return bValue - aValue;
                    } else {
                        return aValue - bValue;
                    }
                };
                return typeof aValue === 'number' ? numberSort(aValue, bValue, order) : stringSort(aValue, bValue, order);
            };
        },

        /**
         * Sorts table by '_id.date' field, which is a nested object of Date components as Numbers.
         *
         * @param order
         * @returns {Function}
         */
        sortByDate: function(order) {
            return function (a, b) {
                var aDate, bDate;
                if (a._id.date.day && a._id.date.hour) {
                    aDate = new Date(a._id.date.year, a._id.date.month - 1, a._id.date.day, a._id.date.hour, 0, 0);
                    bDate = new Date(b._id.date.year, b._id.date.month - 1, b._id.date.day, b._id.date.hour, 0, 0);
                } else if (a._id.date.day) {
                    aDate = new Date(a._id.date.year, a._id.date.month - 1, a._id.date.day);
                    bDate = new Date(b._id.date.year, b._id.date.month - 1, b._id.date.day);
                } else {
                    aDate = new Date(a._id.date.year, a._id.date.month - 1);
                    bDate = new Date(b._id.date.year, b._id.date.month - 1);
                }
                if (order === 'asc') {
                    return aDate - bDate;
                } else {
                    return bDate - aDate;
                }
            };
        },
        /**
         * Sorts table data (array of objects) by specified header name. Can sort Dates, Numbers & Strings
         * automatically.
         *
         * @param data
         * @param headerName
         * @param currentSorting
         */
        sortTableBy: function (data, headerName, currentSorting) {
            var self = this;
            if (currentSorting.orderBy !== headerName) {
                currentSorting.orderBy = headerName;
                currentSorting.order = 'desc';
            } else {
                currentSorting.order = currentSorting.order === 'asc' ? 'desc' : 'asc';
            }
            if (currentSorting.orderBy !== 'Hour' &&
                currentSorting.orderBy !== 'Day' &&
                currentSorting.orderBy !== 'Month') {
                data.sort(self.sortByValue(headerName, currentSorting.order));
            } else {
                data.sort(self.sortByDate(currentSorting.order));
            }
         }
     };
});