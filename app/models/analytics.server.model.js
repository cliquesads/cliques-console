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
    filters: [{ type: String }],
    humanizedDateRange: { type: String },
    isSaved: { type: Boolean, required: true, default: false },
    name: { type: String, require: true },
    // cron syntax
    //TODO: add validator function using cron-parser
    schedule: { type: String }
}, {
    timestamps: true
});

var Query = mongoose.model('Query', QuerySchema);