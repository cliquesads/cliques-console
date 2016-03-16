var errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode'),
    mail = require('./mailer.server.controller'),
    util = require('util'),
    config = require('config');

var mailer = new mail.Mailer();

var buildInviteURL = function(organizationId, accessTokenId){
    var protocol = 'https';
    if (process.env.NODE_ENV === 'local-test'){
        protocol = 'http';
    }
    var hostname = config.get(util.format("Console.%s.external.hostname", protocol));
    var base = util.format("%s://%s", protocol, hostname);
    return util.format("%s/#!/invite/organization/%s/%s", base, organizationId, accessTokenId);
};

module.exports = {

    /**
     * Get a single organization
     */
    read: function (req, res) {
        res.json(req.organization);
    },

    /**
     * Organization middleware
     */
    organizationByID: function (req, res, next, id) {
        Organization.findById(id).populate('users').exec(function (err, organization){
            if (err) return next(err);
            if (!organization) return next(new Error('Failed to load organization ' + id));
            req.organization = organization;
            next();
        });
    },

    /**
     * Create a new organization
     */
    create: function(req, res) {
        var organization = new Organization(req.body);
        organization.save(function (err, org) {
            if (err) return handleError(res, err);
            return res.json(org);
        });
    },

    /**
     * Update organization model
     * @param req
     * @param res
     */
    update: function(req, res) {
        var organization = req.organization;
        organization = _.extend(organization, req.body);
        organization.tstamp = Date.now();
        organization.save(function (err, org) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.status(200).json(org).send();
            }
        });
    },

    /**
     * Delete an organization
     */
    remove: function (req, res) {
        var organization  = req.organization;
        organization.remove(function (err) {
            if (err) {
                console.log(err);
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                res.json(organization);
            }
        });
    },

    /**
     * Authorization middleware -- checks if user has permissions to
     * access organization
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    hasAuthorization: function (req, res, next) {
        var user = _.find(req.organization.users, function(u){ return u.id === req.user.id; });
        if (!user){
            return res.status(403).send({
                message: 'User is not authorized to access this organization'
            });
        }
        next();
    },

    sendUserInvite: function(req, res){
        var organization = req.organization;

        // manually create token and store in ObjectId so you don't have to look
        // it up later after saving Organization when generating link
        var token = mongoose.Types.ObjectId();
        organization.accessTokens.push({
            _id: token,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email
        });

        // TODO: Debatable whether this needs to be a serial process.
        // TODO: Could just save the org and independently send the email, but probably
        // TODO: worth it to keep it serial just to catch any errors saving the Organization
        organization.save(function(err, org){
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                var subject = util.format("%s Has Invited You To Join %s on Cliques",
                    req.user.displayName, organization.name);
                var inviteUrl = buildInviteURL(organization._id, token);
                mailer.sendMailFromUser(subject, 'invite-user-in-org-email.server.view.html',
                    { user: req.user, inviteUrl: inviteUrl, organization: organization },
                    req.user,
                    req.body.email,
                    function(err, success){
                        if (err){
                            res.status(500).send({
                                message: err
                            });
                        } else {
                            res.status(200).send();
                        }
                    }
                );
            }
        });
    }
};