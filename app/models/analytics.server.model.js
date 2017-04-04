/* jshint node: true */ 'use strict';

var mongoose = require('mongoose'),
    _ = require('lodash'),
    Schema = mongoose.Schema;



/**
 * Abstraction of specific billing terms for special advertisers.
 */
var QuerySchema = exports.Query = new Schema({
    user: { type: Schema.ObjectId, required: true, ref: 'User' },
    groupBy: [{ type: String }],
    dateGroupBy: { type: String },
    filters: [{ type: String }],
    dateRangeShortCode: { type: String },
    humanizedDateRange: { type: String },
    isSaved: { type: Boolean, required: true, default: false },
    name: { type: String, require: true },
    // cron syntax
    //TODO: add validator function using cron-parser
    schedule: { type: String },
    // If saved as periodic query, the next datetime this query will be executed again
    nextRun: { type: Date }
}, {
    timestamps: true
});

var Query = mongoose.model('Query', QuerySchema);