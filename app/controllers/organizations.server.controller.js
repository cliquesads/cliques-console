var errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    AccessCode = mongoose.model('AccessCode');

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
        Organization.findById(id).exec(function (err, organization) {
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
        if (req.organization.users.indexOf(req.user._id) === -1){
            return res.status(403).send({
                message: 'User is not authorized to access this organization'
            });
        }
        next();
    }
};