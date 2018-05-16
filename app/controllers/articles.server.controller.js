/* jshint node: true */
'use strict';

/**
 * Module dependencies.
 */
const node_utils = require('@cliques/cliques-node-utils'),
    errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    Article = mongoose.model('Article');

module.exports = (db) => {

    return {
        /**
         * Get single article by ID
         * @param req
         * @param res
         */
        read: function (req, res) {
            return res.json(req.article);
        },

        /**
         * Screenshot middleware
         */
        articleByID: function (req, res, next, id) {
            Article
                .findById(id)
                .populate('tf_idf.article')
                .populate('publisher')
                .exec((err, article) => {
                    if (err) return next(err);
                    if (!article) return next(new Error('Failed to load article ' + id));
                    req.article = article;
                    next();
                });
        },

        getMany: function(req, res){
            // TODO: Mongo 3.4.7 seems to have an issue passing limits as strings, but apiQuery (which isn't maintained)
            // TODO: Needs them passed as strings b/c it performs regex on them. So either need to patch apiQuery
            // TODO: or get rid of this functionality altogether.
            // this defaults to 10, kind of infuriating
            if (req.query.per_page){
                try {
                    req.query.per_page = Number(req.query.per_page);
                } catch(e) {
                    req.query.per_page = null;
                }
            }
            const params = Article.apiQueryParams(req.query);
            Article.count(params.searchParams, (err, count) => {
                Article.apiQuery(req.query).populate('tf_idf.article').exec((err, articles) => {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json({
                            current: req.query.page ? Number(req.query.page) : null,
                            pages: req.query.per_page ? Math.ceil(count / req.query.per_page) : null,
                            count: count,
                            results: articles
                        });
                    }
                });
            });
        },

        /**
         * Screenshot authorization middleware -- user has to either be a networkAdmin,
         * or screenshot must belong to an advertiser or publisher under their organization.
         */
        hasAuthorization: function (req, res, next) {
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                return res.status(403).send({
                    message: 'User is not authorized'
                });
            }
            next();
        },

    };
};