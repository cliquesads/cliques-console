'use strict';

angular.module('aggregations').factory('MongoTimeSeries',function(){
    /**
     * Helper class to convert aggregation data from API to chart format
     *
     * @param apiData
     * @param options
     * @param fields
     * @constructor
     */
    var MongoTimeSeries = function(apiData, options){
        this.dateField = options.dateField || 'date';
        this.fields = options.fields;
        this._initializeSeries();
        this._read(apiData)
    };
    MongoTimeSeries.prototype._initializeSeries = function(){
        var self = this;
        self.fieldOperators = {};
        this.fields.forEach(function(fieldspec){
            if (typeof fieldspec === 'string'){
                self[fieldspec] = [];
                // Add just pass-through function to operators, since no function declared
                // for this field
                self.fieldOperators[fieldspec] = function(row){return row[fieldspec]}
            } else if (typeof fieldspec === 'object'){
                var field = Object.keys(fieldspec)[0]; // I think this is safe to do but not 100% sure
                self[field] = [];
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
            var thisDate = new Date(Date.UTC(dateJSON.year, dateJSON.month || null, dateJSON.day || null, dateJSON.hour || null, dateJSON.minute || null, dateJSON.second || null));

            // now read API data into individual series stored on self,
            // calling field operator function for each
            Object.keys(self.fieldOperators).forEach(function(field){
                var fieldFunc = self.fieldOperators[field];
                self[field].push([thisDate, fieldFunc(row)]);
            });
        });
    };
    return MongoTimeSeries;
});