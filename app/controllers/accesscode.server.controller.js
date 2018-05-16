'use strict';
const errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    util = require('util'), config = require('config'),
    mail = require('./mailer.server.controller'),
    async = require('async');

const mailer = new mail.Mailer({
    mailerType: 'mandrill',
    fromAddress: 'support@cliquesads.com'
});

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
        AccessCode.findById(id).populate('issuerOrgs').exec((err, accessCode) => {
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
        const accessCode = new AccessCode(req.body);
        accessCode.save((err, ac) => {
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
        const thisAccessCode = _.extend(req.accessCode, req.body);
        thisAccessCode.save((err, newAccessCode) => {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                AccessCode.populate(newAccessCode, {path: 'issuerOrgs'}, (err, c) => {
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
        let query = {};
        if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
            query = { issuerOrg: req.user.organization.id };
        }
        AccessCode.find(query).populate('issuerOrgs').exec((err, accessCodes) => {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.json(accessCodes);
            }
        });
    },

    /**
     * Delete an advertiser
     */
    remove: function (req, res) {
        const accessCode = req.accessCode;
        accessCode.remove(err => {
            if (err) {
                console.log(err);
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.json(accessCode);
            }
        });
    },

    sendToUser: function(req, res){
        const accessCode = req.accessCode;
        const asyncFuncs = [];
        const fu = thisUser => callback => {
            let protocol = 'https';
            if (process.env.NODE_ENV === 'local-test'){
                protocol = 'http';
            }
            const hostname = req.headers.host;
            const subject = util.format("%s: You've Been Invited To Join Cliques", thisUser.firstName);
            const inviteUrl = util.format("%s://%s/#!/beta-access?accessCode=%s",protocol,hostname,accessCode.code);
            const templateName = 'welcome-cliques-access-code';
            mailer.sendMailFromUser(subject, templateName, {
                firstName: thisUser.firstName,
                inviteUrl: inviteUrl,
                accessCode: accessCode.code
            }, req.user, thisUser.email, callback);
        };
        req.body.forEach(user => {
            const func = fu(user);
            asyncFuncs.push(func);
        });
        async.parallel(asyncFuncs, (err, results) => {
            if (err){
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                return res.status(200).send();
            }
        });
    }
};
