var errorHandler = require('./errors.server.controller'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    Payment = mongoose.model('Payment'),
    InsertionOrder = mongoose.model('InsertionOrder'),
    mail = require('./mailer.server.controller'),
    util = require('util'),
    config = require('config'),
    async = require('async');

var mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });
var stripe = require('stripe')(config.get("Stripe.secret_key"));

module.exports = {
    payments: {
        /**
         * Get a single payment
         */
        read: function (req, res) {
            res.json(req.payment);
        },

        /**
         * Gets arbitrary number of payments
         */
        getMany: function (req, res) {
            // limit scope of query to just those advertisers to which
            // user is permitted to see
            // Right now this is all advertisers in org
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1){
                req.query.organization = req.user.organization.id;
            }
            Payment.find(req.query, function (err, payments) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.json(payments);
                }
            });
        },

        /**
         * Organization payment
         */
        paymentByID: function (req, res, next, id) {
            Payment.findById(id).populate({
                path: 'organization',
                populate: { path: 'owner'}
            }).exec(function (err, payment){
                if (err) return next(err);
                if (!payment) return next(new Error('Failed to load payment ' + id));
                req.payment = payment;
                next();
            });
        },

        /**
         * Update payment model
         * @param req
         * @param res
         */
        update: function(req, res) {
            var payment = req.payment;
            payment = _.extend(payment, req.body);
            payment.tstamp = Date.now();
            payment.save(function (err, payment) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.status(200).json(payment).send();
                }
            });
        },

        getInvoicePreview: function(req, res){
            var payment = req.payment;
            res.render('templates/billing/advertiser_invoice', {
               payment: payment
            });
        },

        /**
         * Authorization middleware -- checks if user's org has permissions to access payment
         * @param req
         * @param res
         * @param next
         * @returns {*}
         */
        hasAuthorization: function (req, res, next) {
            if (req.user.organization.organization_types.indexOf('networkAdmin') === -1) {
                if (req.user.organization._id.toString() != req.payment.organization._id.toString()) {
                    return res.status(403).send({
                        message: 'User is not authorized to access this organization'
                    });
                }
            }
            next();
        }
    }
};
