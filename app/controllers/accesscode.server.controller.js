'use strict';
const errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    AccessLink= mongoose.model('AccessLink'),
    util = require('util'),
    mail = require('./mailer.server.controller'),
    async = require('async');

const mailer = new mail.Mailer({
    mailerType: 'mandrill',
    fromAddress: 'support@cliquesads.com'
});

module.exports = {
    accessCode: {
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
                if (!accessCode) return next(new Error(`Failed to load accessCode ${id}`));
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
    },
    accessLink: {
        /**
         * Get a single accessLink
         */
        read: function (req, res) {
            res.json(req.accessLink);
        },

        /**
         * AccessLink middleware
         */
        accessLinkByID: function (req, res, next, id) {
            AccessLink.findById(id)
                .populate('delegatedAdvertiser')
                .populate('delegatedPublisher')
                .populate('createdBy')
                .exec((err, accessLink) => {
                    if (err) return next(err);
                    if (!accessLink) return next(new Error(`Failed to load accessLink ${id}`));
                    req.accessLink = accessLink;
                    next();
                });
        },

        /**
         * Create new AccessLink
         */
        create: function(req, res) {
            const accessLink = new AccessLink(req.body);
            accessLink.createdBy = req.user;
            accessLink.save((err, ac) => {
                AccessLink.populate(ac, {path: 'delegatedAdvertiser delegatedPublisher createdBy'}, (err, newAc) => {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json(newAc);
                    }
                });
            });
        },

        /**
         * Update AccessLink
         */
        update: function(req, res) {
            const thisAccessLink = _.extend(req.accessLink, req.body);
            thisAccessLink.save((err, newAccessLink) => {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    AccessLink.populate(newAccessLink, {path: 'delegatedAdvertiser delegatedPublisher createdBy'}, (err, c) => {
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
         * access accessLink. Only networkAdmin org users can access accessLinks.
         *
         * @param req
         * @param res
         * @param next
         * @returns {*}
         */
        hasAuthorization: function (req, res, next) {
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                return res.status(403).send({
                    message: 'User is not authorized to access this organization'
                });
            }
            next();
        },

        /**
         * Gets all accessLinks
         */
        getMany: function (req, res) {
            AccessLink.find(req.query)
                .populate('delegatedAdvertiser')
                .populate('delegatedPublisher')
                .populate('createdBy').exec((err, accessLinks) => {
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        res.json(accessLinks);
                    }
                });
        },

        /**
         * Delete an advertiser
         */
        remove: function (req, res) {
            const accessLink = req.accessLink;
            accessLink.remove(err => {
                if (err) {
                    console.log(err);
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.json(accessLink);
                }
            });
        },

        sendToUser: function(req, res){
            const accessLink = req.accessLink;
            let protocol = 'https';
            if (process.env.NODE_ENV === 'local-test'){
                protocol = 'http';
            }
            const hostname = req.headers.host;
            const subject = util.format("%s: You've Been Invited To Join Cliques", accessLink.firstName);
            const inviteUrl = util.format("%s://%s/#!/invite/%s",protocol,hostname,accessLink.id);
            const templateName = 'welcome-cliques-access-link';
            mailer.sendMailFromUser(subject, templateName, {
                firstName: accessLink.firstName,
                inviteUrl: inviteUrl,
            }, req.user, accessLink.email, err =>{
                if (err){
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    return res.status(200).send();
                }
            });
        }
    }
};
