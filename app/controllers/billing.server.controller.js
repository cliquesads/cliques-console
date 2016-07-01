var errorHandler = require('./errors.server.controller'),
    paymentStatuses = require('../models/billing.server.model').PAYMENT_STATUSES,
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    _ = require('lodash'),
    Organization = mongoose.model('Organization'),
    Payment = mongoose.model('Payment'),
    InsertionOrder = mongoose.model('InsertionOrder'),
    mail = require('./mailer.server.controller'),
    util = require('util'),
    moment = require('moment-timezone'),
    config = require('config'),
    fs = require('fs'),
    mkdirp = require('mkdirp');
    pdf = require('html-pdf');
    async = require('async');

var mailer = new mail.Mailer({
    fromAddress : "billing@cliquesads.com",
    mailerOptions: {
        service: config.get('Email.Billing.service'),
        auth: {
            user: config.get('Email.Billing.username'),
            pass: config.get('Email.Billing.password')
        }
    }
});
var stripe = require('stripe')(config.get("Stripe.secret_key"));
// email list to send billing emails to in testing
var TEST_EMAILS = ['bliang@cliquesads.com'];

module.exports = {
    payments: {
        /**
         * Get a single payment
         */
        read: function (req, res) {
            res.json(req.payment);
        },

        /**
         * Gets constant for all available types of payment statuses
         * @param req
         * @param res
         */
        getStatuses: function(req, res){
            res.json(paymentStatuses);
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
                // filter pre-approval invoices before responding if user is not in
                // networkAdmin org
                req.query.status = { $ne: "Needs Approval"}
            }
            Payment.find(req.query).populate({
                path: 'organization',
                populate: { path: 'owner'}
            }).exec(function (err, payments) {
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
                populate: { path: 'owner termsAndConditions'}
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

        /**
         * Wrapper for Payment.renderHtmlInvoice
         *
         * @param req
         * @param res
         */
        getInvoicePreview: function(req, res){
            var payment = req.payment;
            payment.renderHtmlInvoice(function(err, invoice){
                if (err){
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                }
                return res.status(200).send(invoice);
            })
        },

        /**
         * Generates PDF & HTML invoices and sends to appropriate users.
         * @param req
         * @param res
         */
        generateAndSendInvoice: function(req, res){
            var payment = req.payment;

            // helper functions
            var _getInvoicePath = function(extension){
                var orgType = payment.organization.effectiveOrgType;
                return util.format('public/uploads/billing/%s/%s/', orgType, extension);
            };
            var _getInvoiceFileName = function(extension){
                var orgType = payment.organization.effectiveOrgType;
                return util.format(
                    'Cliques-%s-statement_%d_%s.%s',
                    orgType,
                    payment._id,
                    moment(payment.start_date).tz('UTC').format('MMMM-YYYY'),
                    extension
                );
            };

            var pdfInvoiceName = _getInvoiceFileName('pdf'),
                pdfInvoicePath = _getInvoicePath('pdf'),
                htmlInvoiceName = _getInvoiceFileName('html'),
                htmlInvoicePath = _getInvoicePath('html');

            // Sub-function to encapsulate email logic
            var _sendStatementEmails = function(callback){
                var subject = util.format("Your Cliques Billing Statement for %s is Ready",
                    moment(payment.start_date).tz('UTC').format('MMMM YYYY'));
                // Add "ACTION REQUIRED" prefix if advertiser & they need to send a check
                if (payment.organization.billingPreference === 'Check'
                    && payment.organization.effectiveOrgType === 'advertiser'){
                    subject = 'ACTION REQUIRED: ' + subject;
                }
                var asyncFuncs = [];
                var billingEmails = [];
                // build email list, taking into account environment. Only send to users if it's in prod.
                if (process.env.NODE_ENV === 'production') {
                    if (!_.isNil(payment.organization.billingEmails)) {
                        if (payment.organization.billingEmails.length > 0) {
                            billingEmails = payment.organization.billingEmails;
                        }
                    }
                    if (payment.organization.sendStatementToOwner) {
                        billingEmails.push(payment.organization.owner.email)
                    }
                } else {
                    billingEmails = TEST_EMAILS;
                }
                billingEmails.forEach(function(address){
                    var func = function(callback) {
                        mailer.sendMail({
                            subject: subject,
                            templateName: 'billing-statement-email.server.view.html',
                            to: address,
                            fromAlias: "Cliques Billing",
                            attachments: [
                                {
                                    filename: pdfInvoiceName,
                                    path: pdfInvoicePath + pdfInvoiceName
                                }
                            ],
                            data: { payment: payment }
                        }, callback);
                    };
                    asyncFuncs.push(func);
                });
                async.parallel(asyncFuncs, callback);
            };

            // Now kick it all off
            payment.renderHtmlInvoice(function(err, invoice){
                if (err){
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                }
                async.parallel([
                    // write HTML file
                    function(callback){
                        mkdirp(htmlInvoicePath, function(err){
                            if (err) return callback(err);
                            fs.writeFile(htmlInvoicePath+ htmlInvoiceName, invoice, callback)
                        });
                    },
                    // write PDF file
                    function(callback){
                        mkdirp(pdfInvoicePath, function(err){
                            if (err) return callback(err);
                            var pdfOpts = {
                                format: 'Letter',
                                border:  {
                                    top: "10px",
                                    bottom: "10px"
                                }
                            };
                            pdf.create(invoice, pdfOpts).toFile(pdfInvoicePath + pdfInvoiceName,callback);
                        });
                    }
                ], function(err, results){
                    if (err) return res.status(400).send({
                        message: err
                    });
                    _sendStatementEmails(function(err, successes){
                        if (err) return res.status(400).send({
                           message: err
                        });
                        res.status(200).send();
                    });
                });
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
