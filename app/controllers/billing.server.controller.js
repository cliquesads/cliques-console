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
    path = require('path'),
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
                populate: { path: 'owner payments'}
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
                populate: { path: 'owner termsAndConditions payments'}
            }).exec(function (err, payment){
                if (err) return next(err);
                if (!payment) return next(new Error('Failed to load payment ' + id));
                req.payment = payment;
                next();
            });
        },

        /**
         * Update payment model
         *
         * ALSO updates Organization.accountBalance as well, depending on whether status of invoice has changed.
         *
         * @param req
         * @param res
         */
        update: function(req, res) {
            var payment = req.payment;
            payment = _.extend(payment, req.body);
            payment.tstamp = Date.now();
            payment.save(function (err, p) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                } else {
                    res.status(200).json(p).send();
                }
            });
        },

        /**
         * Special method to handle setting status to "Paid", since promos on
         * organization will also need to be modified depending on how much was used.
         *
         * @param req
         * @param res
         */
        setPaid: function(req, res){
            var payment = req.payment;
            var org = req.payment.organization;
            if (payment.status === 'Needs Approval'){
                res.status(403).send({
                    message: 'Payment must be approved before it can be marked Paid'
                });
            }
            // handle promo cleanup & deactivation
            org.applyPromosToTotal(payment.totalAmount);
            org.save(function(err, org){
                if (err){
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    })
                }
                payment.save(function(err, payment){
                    if (err) {
                        return res.status(400).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    }
                    res.status(200).json(payment).send();
                });
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
            // add payment amount to accountBalance if status == "Needs Approval" so
            // outstanding balance renders properly in preview mode.
            if (payment.status === 'Needs Approval'){
                payment.organization.accountBalance += payment.totalAmount;
            }
            payment.renderHtmlInvoice(function(err, invoice){
                if (err){
                    return res.status(400).send({
                        message: errorHandler.getAndLogErrorMessage(err)
                    });
                }
                return res.status(200).send(invoice);
            });
        },

        viewInvoice: function(req, res){
            var payment = req.payment;
            if (payment.invoicePath){
                res.sendFile(payment.invoicePath, {
                    root: path.resolve(__dirname, '../..')
                }, function(err){
                    if (err) return console.error(err);
                });
            } else {
                res.status(404).send({
                    message: "An invoice has not been generated for this payment."
                });
            }
        },

        /**
         * Generates PDF & HTML invoices and sends to appropriate users.
         * @param req
         * @param res
         */
        generateAndSendInvoice: function(req, res){
            var payment = req.payment;
            // whether or not to send email
            var email = req.query.email;

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
                // build email list, taking into account environment. Only send to users if it's in prod.
                if (process.env.NODE_ENV === 'production') {
                    var billingEmails = payment.organization.getAllBillingEmails();
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
                            fs.writeFile(htmlInvoicePath+ htmlInvoiceName, invoice, function(err){
                                // update payment to link to invoiceURL
                                payment.invoicePath = htmlInvoicePath + htmlInvoiceName;
                                payment.save(callback);
                            });
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
                    if (err) {
                        console.error(err);
                        return res.status(400).send({
                            message: err.toString()
                        });
                    }
                    if (email){
                        _sendStatementEmails(function(err, successes){
                            if (err) return res.status(400).send({
                                message: err.toString()
                            });
                            // send updated payment w/ invoice URL
                            res.status(200).send(results[0][0]);
                        });
                    } else {
                        res.status(200).send(results[0][0]);
                    }
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
