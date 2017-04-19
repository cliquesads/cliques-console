/* global _, angular, moment */
'use strict';

function getDatesArray(startDate, stopDate, unit){
    var dateArray = [];
    // clone startDate to a new moment object without modifying the original startDate
    var currentDate = moment(startDate);
    var oldOffset, newOffset;
    while (currentDate.isBefore(stopDate) || currentDate.isSame(stopDate)) {
        dateArray.push( currentDate.valueOf() );
        oldOffset = currentDate._offset;
        currentDate.add(1,unit + 's');
        newOffset = currentDate._offset;
        // Have to do this for days when DST comes on/off, else day timestamps will not line up
        // TODO: This will break if hours are used as units, find better solution
        if (oldOffset !== newOffset){
            currentDate.add(newOffset - oldOffset, 'minutes');
        }
    }

    // when timeUnit is 'month', make sure the month of stopDate gets counted as well
    if (unit === 'month' && startDate.month() !== stopDate.month()) {
        dateArray.push(currentDate.valueOf());
    }
    return dateArray;
}

angular.module('aggregations').factory('MongoTimeSeries',function(){
    /**
     * Helper class to convert aggregation data from API to chart format.
     *
     * Reads response from aggregation API, converts to chart-friendly
     * series, and fills zeros for missing dates.
     *
     * NOTE: Not optimized for larger datasets, really should only be used
     * for chart data.
     *
     * @param apiData response from aggregation API
     * @param startDate ISOFormatted datetime
     * @param endDate ISOFormatted datetime
     * @param timezone tz string to specify timezone in which start & end dates were generated.
     * @param timeUnit
     * @param options
     * @constructor
     */
    var MongoTimeSeries = function(apiData, startDate, endDate, timezone, timeUnit, options){
        this.dateField = options.dateField || 'date';
        this.fields = options.fields;
        this.timezone = timezone;

        // TODO: hack just to get Flot charts to display properly
        // TODO: Have to add back TZ offsets to get dates in UTC
        // TODO: because Flot doesn't use timezone aware dates for timeseries,
        // TODO: only timestamps
        function makeFakeUTC(d, tz){
            var realMoment = moment(d).tz(tz);
            return realMoment.add(realMoment._offset,'minutes');
        }
        this.startDate = makeFakeUTC(startDate, timezone);
        this.endDate = makeFakeUTC(endDate, timezone);
        this.timeUnit = timeUnit;

        var zerosArray = getDatesArray(this.startDate, this.endDate, this.timeUnit);
        this.zerosArray = zerosArray.map(function(d){ return [d, 0];});

        this._initializeSeries();
        this._read(apiData);
    };
    MongoTimeSeries.prototype._initializeSeries = function(){
        var self = this;
        self.fieldOperators = {};
        this.fields.forEach(function(fieldspec){
            if (typeof fieldspec === 'string'){
                self[fieldspec] = self.zerosArray.slice(0);
                // Add just pass-through function to operators, since no function declared
                // for this field
                self.fieldOperators[fieldspec] = function(row){return row[fieldspec];};
            } else if (typeof fieldspec === 'object'){
                var field = Object.keys(fieldspec)[0]; // I think this is safe to do but not 100% sure
                self[field] = self.zerosArray.slice(0);
                self.fieldOperators[field] = fieldspec[field];
            }
        });
    };
    MongoTimeSeries.prototype._read = function(apiData){
        var self = this;
        // Iterate over rows and create timeseries for each field specified
        apiData.forEach(function(row){
            var dateJSON = row._id[self.dateField];
            // apiData contains date objects specifying date params in user-specific timezone
            // use moment to set timezone
            if (dateJSON.hasOwnProperty('month')){
                dateJSON.month = dateJSON.month -1;
            }
            // have to 'pretend' this date is UTC for display purposes
            // TODO: This is a hack to get Flot charts to display timeseries properly,
            // TODO: fix generally
            var thisDate = moment.tz(dateJSON,'UTC').valueOf();

            // now read API data into individual series stored on self,
            // calling field operator function for each
            // TODO: This is going to be pretty slow, not good for larger datasets
            Object.keys(self.fieldOperators).forEach(function(field){
                var fieldFunc = self.fieldOperators[field];
                // get index in initial zeros array of this date and
                // replace element
                var ind = _.findIndex(self[field], function(ar) {
                    if (self.timeUnit !== 'month') {
                        return ar[0] === thisDate;
                    } else {
                        // check if 2 values are within the same month
                        var tempDate1 = moment.tz(ar[0], 'UTC');
                        var tempDate2 = moment.tz(thisDate, 'UTC');
                        return tempDate1.month() === tempDate2.month();
                    }
                });
                if (ind > -1){
                    self[field][ind] = [thisDate, fieldFunc(row)];
                }
            });
        });
    };
    return MongoTimeSeries;
});