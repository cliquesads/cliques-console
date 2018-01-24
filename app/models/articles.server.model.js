/* jshint node: true */ 'use strict';

const mongoose = require('mongoose'),
    _ = require('lodash'),
    mongooseApiQuery = require('mongoose-api-query'),
    Schema = mongoose.Schema;

const OpenGraphSchema = new Schema({
    title: String,
    description: String,
    locale: String,
    type: String,
    url: String,
    site_name: String,
    updated_time: Date,
    image: String,
    image_secure_url: String,
    image_width: Number,
    image_height: Number
});

const ArticleMetaSchema = new Schema({
    tag: [String],
    publisher: String,
    section: String,
    published_time: { type: Date, index: true },
    modified_time: { type: Date, index: true }
});

const ArticleWeightSchema = new Schema({
    article: { type: String, ref: 'Article' },
    weight: { type: Number }
});

const ArticleSchema = exports.Article = new Schema({
    tstamp: { type: Date, default: Date.now },
    publisher: { type: String, ref: 'Publisher' },
    site: { type: String, ref: 'Site' },
    url: { type: String },
    text: { type: String },
    meta: {
        opengraph: OpenGraphSchema,
        article: ArticleMetaSchema
    },
    tf_idf: [ArticleWeightSchema]
});

ArticleSchema.plugin(mongooseApiQuery, {});
const Article = mongoose.model('Article', ArticleSchema);
