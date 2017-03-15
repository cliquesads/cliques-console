'use strict';
var errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    util = require('util'),
    config = require('config'),
    mandrill = require('mandrill-api'),
    async = require('async');

var mandrillClient = new mandrill.Mandrill(config.get("Mandrill.apiKey"));

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
        AccessCode.findById(id).populate('issuerOrgs').exec(function (err, accessCode) {
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
        var thisAccessCode = _.extend(req.accessCode, req.body);
        thisAccessCode.save(function (err, newAccessCode) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                AccessCode.populate(newAccessCode, {path: 'issuerOrgs'}, function(err, c) {
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
        var query = {};
        if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
            query = { issuerOrg: req.user.organization.id };
        }
        AccessCode.find(query).populate('issuerOrgs').exec(function (err, accessCodes) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.json(accessCodes);
            }
        });
    },

    sendToUser: function(req, res){
        var accessCode = req.accessCode;
        var asyncFuncs = [];
        var fu = function(thisUser){
            return function(callback){
                var protocol = 'https';
                if (process.env.NODE_ENV === 'local-test'){
                    protocol = 'http';
                }
                var hostname = req.headers.host;
                var subject = util.format("%s: You've Been Invited To Join Cliques", thisUser.firstName);
                var inviteUrl = util.format("%s://%s/#!/beta-access?accessCode=%s",protocol,hostname,accessCode.code);
                var message = {
                    "subject": subject,
                    "from_email": req.user.email,
                    "from_name": req.user.displayName,
                    "to": [{
                        "email": thisUser.email,
                        "name": thisUser.firstName + ' ' + thisUser.lastName,
                        "type": "to"
                    }],
                    "headers": {
                        "Reply-To": req.user.email
                    },
                    "global_merge_vars": [{
                        "name": "CURRENT_YEAR",
                        "content": "2017"
                    },
                    {
                        "name": "firstName",
                        "content": thisUser.firstName
                    },
                    {
                        "name": "inviteUrl",
                        "content": inviteUrl
                    },
                    {
                        "name": "accessCode",
                        "content": accessCode.code
                    }]
                };
                var templateName = 'welcome-cliques-access-code';
                mandrillClient.messages.sendTemplate({
                    "template_name": templateName,
                    "template_content": [{}],
                    "message": message},
                    function(result){
                        if (result[0].status === 'sent'){
                            callback(null, result);
                        } else {
                            callback(result[0].reject_reason, null);
                        }
                    },
                    function(err) {
                        callback(err);
                    }
                );
            };
        };
        req.body.forEach(function(user){
            var func = fu(user);
            asyncFuncs.push(func);
        });
        async.parallel(asyncFuncs, function(err, results){
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
