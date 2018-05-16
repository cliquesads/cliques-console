'use strict';

/**
 * Module dependencies.
 */
const _ = require('lodash'), errorHandler = require('../errors.server.controller'), mongoose = require('mongoose'), swig = require('swig'), TermsAndConditions = mongoose.model('TermsAndConditions');

/**
 * Wrapper for TermsAndConditions instances to compile template & expose only
 * appropriate attributes to client side.
 *
 * @param termsAndConditions
 * @constructor
 */
const ClientTermsAndConditions = function(termsAndConditions){
    const compiledTemplate = swig.compileFile(termsAndConditions.templatePath);
    this._id = termsAndConditions._id;
    this.id = termsAndConditions.id;
    this.html = compiledTemplate({});
    this.tstamp = termsAndConditions.tstamp;
    this.active = termsAndConditions.active;
    this.name = termsAndConditions.name;
    this.url = termsAndConditions.url;
};

exports.read = (req, res) => {
    const termsId = req.param('termsId');
    TermsAndConditions.findById(termsId, (err, terms) => {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(err)
            });
        }
        if (terms){
            const clientTerms = new ClientTermsAndConditions(terms);
            return res.json(clientTerms);
        } else {
            return res.status(400).send({
                message: `No TermsAndConditions found for id: ${termsId}`
            });
        }
    });
};

/**
 * Get most recent active Terms & Conditions by type (param)
 *
 * @param req
 * @param res
 */
exports.getCurrentTerms = (req, res) => {
    const type = req.param('type');
    TermsAndConditions.find({type: type, active: true}).sort('-tstamp').limit(1).exec((err, terms) => {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(err)
            });
        }
        const term = terms[0];
        if (term){
            const clientTerms = new ClientTermsAndConditions(term);
            return res.json(clientTerms);
        } else {
            return res.status(400).send({
                message: `No active TermsAndConditions found for type: ${type}`
            });
        }
    });
};