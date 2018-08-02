/* jshint node: true */
'use strict';

/**
 * Module dependencies.
 */
const errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    SalesPerson = mongoose.model('SalesPerson');

module.exports = (db) => {

    return {
        /**
         * Get single salesPerson by ID
         * @param req
         * @param res
         */
        read: function (req, res) {
            return res.json(req.salesPerson);
        },

        /**
         * Salesperson middleware
         */
        salesPersonByID: function (req, res, next, id) {
            SalesPerson
                .findById(id)
                .populate('user')
                .exec(function (err, salesperson) {
                    if (err) return next(err);
                    if (!salesperson) return next(new Error(`Failed to load salesperson ${id}`));
                    req.salesPerson = salesperson;
                    next();
                });
        },

        getMany: function(req, res){
            // TODO: Mongo 3.4.7 seems to have an issue passing limits as strings, but apiQuery (which isn't maintained)
            // TODO: Needs them passed as strings b/c it performs regex on them. So either need to patch apiQuery
            // TODO: or get rid of this functionality altogether.
            // this defaults to 10, kind of infuriating
            if (req.query.perPage){
                try {
                    req.query.perPage = Number(req.query.perPage);
                } catch(e) {
                    req.query.perPage = null;
                }
            }
            const params = SalesPerson.apiQueryParams(req.query);
            SalesPerson.count(params.searchParams, function(err, count){
                SalesPerson.apiQuery(req.query).populate('user').exec(function (err, salesperson) {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json({
                            current: req.query.page ? Number(req.query.page) : null,
                            pages: req.query.perPage ? Math.ceil(count / req.query.perPage) : null,
                            count: count,
                            results: salesperson
                        });
                    }
                });
            });
        },

        /**
         * Must be networkAdmin org to do anything with sales people
         */
        hasAuthorization: function (req, res, next) {
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                return res.status(403).send({
                    message: 'User is not authorized'
                });
            }
            next();
        },

        /**
         * Create new SalesPerson
         */
        create: function(req, res) {
            const salesPerson = new SalesPerson(req.body);
            salesPerson.save((err, ac) => {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.json(ac);
                }
            });
        },

        /**
         * Update AccessCode
         */
        update: function(req, res) {
            const thisSalesPerson = _.extend(req.salesPerson, req.body);
            thisSalesPerson.save((err, newAccessCode) => {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    SalesPerson.populate(newAccessCode, {path: 'user'}, (err, c) => {
                        if (err){
                            return res.status(400).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                        }
                        return res.json(c);
                    });
                }
            });
        },

        /**
         * Delete an advertiser
         */
        remove: function (req, res) {
            const salesPerson = req.salesPerson;
            salesPerson.remove(err => {
                if (err) {
                    console.log(err);
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.json(salesPerson);
                }
            });
        },

    };
};