/* jshint node: true */ 'use strict';

var mongoose = require('mongoose'),
    _ = require('lodash'),
    mongooseApiQuery = require('mongoose-api-query'),
    moment = require('moment-timezone'),
    Schema = mongoose.Schema;

/**
 * Abstraction of specific billing terms for special advertisers.
 */
var QuerySchema = exports.Query = new Schema({
    user: { type: Schema.ObjectId, required: true, ref: 'User' },
    groupBy: { type: String },
    dateGroupBy: { type: String },
    // filter values
    advertiser: { type: String },
    publisher: { type: String },
    campaign: { type: String },
    site: { type: String },
    country: { type: String },
    region: { type: String },

    dataHeaders: [{type: String}],
    dateRangeShortCode: { type: String },
    humanizedDateRange: { type: String },
    isSaved: { type: Boolean, required: true, default: false },
    name: { type: String, required: true },
    // Allowed type values are:
    // Time, Sites, Campaigns, Creatives, Placements, Cities, States, Countries and Custom
    type: { type: String, required: true },
    // cron syntax
    schedule: { type: String },
    // If saved as periodic query, the next datetime this query will be executed again
    nextRun: { type: Date }
}, {
    timestamps: true
});

/**
 * Get star & end date for query request
 */
QuerySchema.methods.getDatetimeRange = function(timezone) {
    var startDate, endDate;
    var dateRangeShortCode = this.dateRangeShortCode;
    var humanizedDateRange = this.humanizedDateRange;
    switch (dateRangeShortCode) {
        case "7d":
            startDate = moment().tz(timezone).add(1, 'days').startOf('day').subtract(6, 'days').toISOString();
            endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
            break;
        case "30d":
            startDate = moment().tz(timezone).add(1, 'days').startOf('day').subtract(29, 'days').toISOString();
            endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
            break;
        case "90d":
            startDate = moment().tz(timezone).add(1, 'days').startOf('day').subtract(89, 'days').toISOString();
            endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
            break;
        case "lastMonth":
            startDate = moment().tz(timezone).subtract(1, 'months').startOf('month').toISOString();
            endDate = moment().tz(timezone).startOf('month').startOf('day').toISOString();
            break;
        case "mtd":
            startDate = moment().tz(timezone).startOf('month').startOf('day').toISOString();
            endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
            break;
        case "yesterday":
            startDate = moment().tz(timezone).subtract(1, 'days').startOf('day').toISOString();
            endDate = moment().tz(timezone).startOf('day').toISOString();
            break;
        case "today":
            startDate = moment().tz(timezone).startOf('day').toISOString();
            endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
            break;
        case "custom":
            var dates = humanizedDateRange.split(' - ');
            startDate = dates[0];
            endDate = dates[1];
            break;
        default:
            break;
    }
    return {
        startDate: startDate,
        endDate: endDate
    };
};

QuerySchema.plugin(mongooseApiQuery, {});
var Query = exports.Query = mongoose.model('Query', QuerySchema);