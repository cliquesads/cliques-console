'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    errorHandler = require('../errors.server.controller'),
    mongoose = require('mongoose'),
    swig = require('swig'),
    TermsAndConditions = mongoose.model('TermsAndConditions');

/**
 * Wrapper for TermsAndConditions instances to compile template & expose only
 * appropriate attributes to client side.
 *
 * @param termsAndConditions
 * @constructor
 */
var ClientTermsAndConditions = function(termsAndConditions){
    var compiledTemplate = swig.compileFile(termsAndConditions.templatePath);
    this._id = termsAndConditions._id;
    this.id = termsAndConditions.id;
    this.html = compiledTemplate({});
    this.tstamp = termsAndConditions.tstamp;
    this.active = termsAndConditions.active;
    this.name = termsAndConditions.name;
    this.url = termsAndConditions.url;
};

exports.read = function(req, res){
    var termsId = req.param('termsId');
    TermsAndConditions.findById(termsId, function(err, terms){
        if (err) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(err)
            });
        }
        if (terms){
            var clientTerms = new ClientTermsAndConditions(terms);
            return res.json(clientTerms);
        } else {
            return res.status(400).send({
                message: 'No TermsAndConditions found for id: ' + termsId
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
exports.getCurrentTerms = function(req, res){
    var type = req.param('type');
    TermsAndConditions.find({type: type, active: true}).sort('-tstamp').limit(1).exec(function(err, terms){
        if (err) {
            return res.status(400).send({
                message: errorHandler.getAndLogErrorMessage(err)
            });
        }
        var term = terms[0];
        if (term){
            var clientTerms = new ClientTermsAndConditions(term);
            return res.json(clientTerms);
        } else {
            return res.status(400).send({
                message: 'No active TermsAndConditions found for type: ' + type
            });
        }
    });
};