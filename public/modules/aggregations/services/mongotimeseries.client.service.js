'use strict';

function getDatesArray(startDate, stopDate, unit){
    var dateArray = [];
    var currentDate = startDate;
    var unitMethodMapping = {
        'day': function(start, days) {
            var dat = new Date(start.valueOf());
            dat.setDate(dat.getDate() + days);
            return dat;
        },
        'hour': function(start, hours) {
            var dat = new Date(start.valueOf());
            dat.setDate(dat.getHours() + hours);
            return dat;
        },
        'month': function(start, months) {
            var dat = new Date(this.valueOf());
            dat.setMonth(dat.getMonth() + months);
            return dat;
        },
        'year': function(start, years) {
            var dat = new Date(this.valueOf());
            dat.setMonth(dat.getMonth() + years);
            return dat;
        }
    };
    while (currentDate <= stopDate) {
        dateArray.push( new Date (currentDate) );
        currentDate = unitMethodMapping[unit](currentDate, 1);
    }
    return dateArray;
}

angular.module('aggregations').factory('MongoTimeSeries',['d3service', '$q', function(d3service, $q){
    var d = $q.defer();
    d3service.d3().then(function(d3){
        /**
         * Helper class to convert aggregation data from API to chart format
         *
         * @param apiData
         * @param options
         * @param fields
         * @constructor
         */
        var MongoTimeSeries = function(apiData, startDate, endDate, timeUnit, options){
            this.dateField = options.dateField || 'date';
            this.fields = options.fields;
            this.startDate = new Date(startDate);
            this.endDate = new Date(endDate);
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

                // TODO: This will automatically convert date to local time, should make specifiable by user
                var thisDate = new Date(dateJSON.year, dateJSON.month - 1 || null, dateJSON.day || null, dateJSON.hour || null, dateJSON.minute || null, dateJSON.second || null);

                // now read API data into individual series stored on self,
                // calling field operator function for each
                Object.keys(self.fieldOperators).forEach(function(field){
                    var fieldFunc = self.fieldOperators[field];
                    // get index in initial zeros array of this date and
                    // replace element
                    var ind = self[field].indexOf([thisDate, 0]);
                    if (ind > -1){
                        self[field][ind] = [thisDate, fieldFunc(row)];
                    }
                });
            });
        };
        d.resolve(MongoTimeSeries);
    });
    return d.promise;
}]);