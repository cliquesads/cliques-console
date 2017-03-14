'use strict';
var errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    mail = require('./mailer.server.controller'),
    util = require('util'),
    config = require('config'),
    async = require('async');

var mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });

module.exports = {

    /**
     * Get a single accessCode
     */
    read: function (req, res) {
        res.json(req.accessCode);
    },

    /**
     * AccessCode middleware
     */
    accessCodeByID: function (req, res, next, id) {
        AccessCode.findById(id).exec(function (err, accessCode) {
            if (err) return next(err);
            if (!accessCode) return next(new Error('Failed to load accessCode ' + id));
            req.accessCode = accessCode;
            next();
        });
    },

    /**
     * Create new AccessCode
     */
    create: function(req, res) {
        var accessCode = new AccessCode(req.body);
        accessCode.save(function (err, ac) {
            if (err) {
                console.log(err);
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.json(ac);
            }
        });
    },

    /**
     * Authorization middleware -- checks if user has permissions to
     * access accessCode. If user is networkAdmin, can access any code. If
     * not, check if user.organization._id is in accessCode.issuerOrgs array.
     *
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    hasAuthorization: function (req, res, next) {
        if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
            if (req.accessCode.issuerOrgs.indexOf(req.user.organization.id) === -1){
                return res.status(403).send({
                    message: 'User is not authorized to access this organization'
                });
            }
        }
        next();
    },

    /**
     * Gets all accessCodes
     */
    getMany: function (req, res) {
        // limit scope of query to just those accessCodes to which
        // user is permitted to see, i.e. those issued by org unless org is networkAdmin
        var query = {};
        if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
            query = { issuerOrg: req.user.organization.id };
        }
        AccessCode.find(query, function (err, accessCodes) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.json(accessCodes);
            }
        });
    },
};
