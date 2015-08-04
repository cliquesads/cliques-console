'use strict';

function getDatesArray(startDate, stopDate, unit){
    var dateArray = [];
    var currentDate = startDate;
    while (currentDate.isBefore(stopDate) || currentDate.isSame(stopDate)) {
        dateArray.push( currentDate.valueOf() );
        currentDate.add(1,unit + 's');
    }
    return dateArray;
}

angular.module('aggregations').factory('MongoTimeSeries',function(){
    /**
     * Helper class to convert aggregation data from API to chart format
     *
     * @param apiData
     * @param startDate ISOFormatted datetime
     * @param endDate ISOFormatted datetime
     * @param timezone
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
        this.zerosArray = zerosArray.map(function(d){ return [d, 0]});

        this._initializeSeries();
        this._read(apiData)
    };
    MongoTimeSeries.prototype._initializeSeries = function(){
        var self = this;
        self.fieldOperators = {};
        this.fields.forEach(function(fieldspec){
            if (typeof fieldspec === 'string'){
                self[fieldspec] = self.zerosArray;
                // Add just pass-through function to operators, since no function declared
                // for this field
                self.fieldOperators[fieldspec] = function(row){return row[fieldspec]}
            } else if (typeof fieldspec === 'object'){
                var field = Object.keys(fieldspec)[0]; // I think this is safe to do but not 100% sure
                self[field] = self.zerosArray;
                self.fieldOperators[field] = fieldspec[field];
            }
        })
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
            Object.keys(self.fieldOperators).forEach(function(field){
                var fieldFunc = self.fieldOperators[field];
                // get index in initial zeros array of this date and
                // replace element
                var ind = _.findIndex(self[field], function(ar){ return ar[0] === thisDate});
                if (ind > -1){
                    self[field][ind] = [thisDate, fieldFunc(row)];
                }
            });
        });
    };
    return MongoTimeSeries;
});