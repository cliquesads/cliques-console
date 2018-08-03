/* jshint node: true */

const mongoose = require('mongoose'),
    _ = require('lodash'),
    mongooseApiQuery = require('mongoose-api-query'),
    Schema = mongoose.Schema;

const SalesPersonSchema = new Schema({
    created: { type: Date, default: Date.now },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    user: { type: Schema.ObjectId, ref: 'User' },
    externalId: { type: String }
});

SalesPersonSchema.plugin(mongooseApiQuery, {});
const SalesPerson = mongoose.model('SalesPerson', SalesPersonSchema);