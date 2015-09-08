/* jshint node: true */
'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    UserGroup = mongoose.model('UserGroup'),
    config = require('../../../config/config'),
    nodemailer = require('nodemailer');
    swig = require('swig');

/**
 * Helper object to abstract away annoying low-level mail config duties
 * when sending emails.
 *
 * @type {Function}
 * @param {Object} [options]
 * @param {String} [options.fromAddress] can either be straight email address (me@me.com) or of the format "Me <me@me.com>". Default is config.mailer.from
 * @param {Object} [options.templatePath] path to directory containing template files. Default is '../views'
 * @param {Object} [options.mailerOptions] options to pass to nodemailer.createTransport. Default is config.mailer.options
 */
var Mailer = exports.Mailer = function(options){
    this.fromAddress    = options.fromAddress || config.mailer.from;
    this.templatePath   = options.templatePath || '../views';

    // Default to mailer options stored in environment config
    this.mailerOptions  = options.mailerOptions || config.mailer.options;
    this.smtpTransport  = nodemailer.createTransport(this.mailerOptions);
};

/**
 * Base method used to send mail.
 *
 * 'to' value is passed directly to mailOptions 'to', so must be string or array of strings.
 *
 * @param {String} subject email subject
 * @param {String} templateName name of template file stored in self.templatePath
 * @param {Object} data data passed to template to compile
 * @param to passed directly to mailOptions 'to', so must be string or array of strings.
 */
Mailer.prototype.sendMail = function(subject, templateName, data, to){
    var self = this;
    var compiledTemplate = swig.compileFile(self.templatePath + '/' + templateName);
    var html = compiledTemplate(data);
    var mailOptions = {
        to: to,
        from: self.fromAddress,
        subject: subject,
        html: html
    };
    self.smtpTransport.sendMail(mailOptions, function(err){
        if (err) {
            console.error("Error sending email: " + err);
            console.error("Used the following mailOptions: " + mailOptions);
        }
    });
};

/**
 * Convenience method to send email to all users in UserGroup
 *
 * @param {String} subject email subject
 * @param {String} templateName name of template file stored in self.templatePath
 * @param {Object} data data passed to template to compile
 * @param {String} groupName name of UserGroup instance
 */
Mailer.prototype.sendMailToGroup = function(subject, templateName, data, groupName){
    var self = this;
    UserGroup
        .findOne({name: groupName})
        .populate('users.email')
        .exec(function(err, group){
            if (err){
                return console.error('Error looking up groupName ' + groupName + ' : ' + err);
            }
            // Send single email to all users
            // Could loop through and send multiple emails to individual users
            // but no need to right now
            var to = group.users.map(function(user){ return user.email });
            self.sendMail(subject, templateName, data, to);
        });
};

/**
 * Almost trivial convenience method to send mail to user
 * @param subject
 * @param templateName
 * @param {Object} data
 * @param {User} user instance of user model
 */
Mailer.prototype.sendMailToUser = function(subject, templateName, data, user){
    self.sendMail(subject, templateName, data, user.email);
};