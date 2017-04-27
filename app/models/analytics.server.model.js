/* jshint node: true */ 'use strict';

var mongoose = require('mongoose'),
    _ = require('lodash'),
    mongooseApiQuery = require('mongoose-api-query'),
    Schema = mongoose.Schema;

/**
 * Abstraction of specific billing terms for special advertisers.
 */
var QuerySchema = exports.Query = new Schema({
    user: { type: Schema.ObjectId, required: true, ref: 'User' },
    groupBy: { type: String },
    dateGroupBy: { type: String },
    filters: [{ type: String }],
    dataHeaders: [{type: String}],
    dateRangeShortCode: { type: String },
    humanizedDateRange: { type: String },
    isSaved: { type: Boolean, required: true, default: false },
    name: { type: String, required: true },
    // Allowed type values are::: 
    // Time, Sites, Campaigns, Creatives, Placements, Cities, States, Countries and Custom
    type: { type: String, required: true },
    // cron syntax
    //TODO: add validator function using cron-parser
    schedule: { type: String },
    // If saved as periodic query, the next datetime this query will be executed again
    nextRun: { type: Date }
}, {
    timestamps: true
});

QuerySchema.plugin(mongooseApiQuery, {});
var Query = mongoose.model('Query', QuerySchema);