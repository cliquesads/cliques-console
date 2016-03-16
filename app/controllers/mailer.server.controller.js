/* jshint node: true */
'use strict';
var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Organization = mongoose.model('Organization'),
    config = require('../../config/config'),
    nodemailer = require('nodemailer'),
    EmailTemplates = require('swig-email-templates'),
    _ = require('lodash');

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
    options             = options || {};
    this.fromAddress    = options.fromAddress || 'support@cliquesads.com';
    this.templatePath   = options.templatePath || config.templatePath;

    // init email templates compiler, which uses Swig to compile templates
    // and Juice to take care of inlining all CSS to be compatible with email clients
    this.templateRenderer = new EmailTemplates({
        root: this.templatePath
    });

    //// Default to mailer options stored in environment config
    this.mailerOptions  = options.mailerOptions || config.mailer.options;
    this.smtpTransport  = nodemailer.createTransport(this.mailerOptions);
    //this.client = new postmark.Client(config.postmark.apiToken);
    this.defaults = {
        appName: config.app.title
    }
};

/**
 * Base method used to send mail.
 *
 * 'to' value is passed directly to mailOptions 'to', so must be string or array of strings.
 *
 * NOTE: will extend mailOptions.data with Mailer.defaults, and set a template variable 'subject'
 * to mailOptions.subject
 *
 * @param {Object} mailOptions
 * @param {String} mailOptions.subject email subject
 * @param {String} mailOptions.templateName name of template file stored in self.templatePath
 * @param {String} mailOptions.to passed directly to sendEmail 'to', so must be string or array of strings.
 * @param {Object} [mailOptions.data] data passed to template to compile
 * @param {String} [mailOptions.fromAlias] Can't set 'from' header w/ Gmail, but this at least changes the display to "[fromAlias] <support@cliquesads.com>"
 * @param {String} [mailOptions.replyTo] replyTo field
 * @param {Function} callback
 */
Mailer.prototype.sendMail = function(mailOptions, callback){
    var self = this;
    //var compiledTemplate = swig.compileFile(self.templatePath + '/' + mailOptions.templateName);
    // extend data with defaults
    _.extend(mailOptions.data, self.defaults);
    // extend data with 'subject'
    // NOTE: this will overwrite data.subject if it's passed in,
    // NOTE: probably not a good idea to set it anyway
    _.extend(mailOptions.data, { subject: mailOptions.subject});
    mailOptions.from = mailOptions.fromAlias ? mailOptions.fromAlias + " <" + self.fromAddress + ">" : self.fromAddress;
    self.templateRenderer.render(mailOptions.templateName, mailOptions.data, function(err, html, text){
        if (err){
            if (callback) callback(err);
            return console.error("Error rendering email template: " + err);
        }
        mailOptions.html = html;
        mailOptions.text = text;
        self.smtpTransport.sendMail(mailOptions, function(err, success){
            if (callback){
                callback(err, success);
            }
            if (err) {
                console.error("Error sending email: " + err);
                console.error("Used the following mailOptions: " + mailOptions);
            }
        });
    });
};

/**
 *
 * Convenience method to send email to all users in Organization
 *
 * @param {String} subject email subject
 * @param {String} templateName name of template file stored in self.templatePath
 * @param {Object} data data passed to template to compile
 * @param {String} orgName name of Organization instance
 * @param {Function} callback
 */
Mailer.prototype.sendMailToOrganization = function(subject, templateName, data, orgName, callback){
    var self = this;
    Organization
        .findOne({name: orgName})
        .populate('users')
        .exec(function(err, group){
            if (err){
                return console.error('Error looking up orgName ' + orgName + ' : ' + err);
            }
            // Send single email to all users
            // Could loop through and send multiple emails to individual users
            // but no need to right now
            var to = group.users.map(function(user){ return user.email; });
            self.sendMail({
                subject: subject,
                templateName: templateName,
                data: data,
                to: to
            }, callback);
        });
};

/**
 * Almost trivial convenience method to send mail to user
 * @param subject
 * @param templateName
 * @param {Object} data
 * @param {User} user instance of user model
 * @param {Function} callback
 */
Mailer.prototype.sendMailToUser = function(subject, templateName, data, user, callback){
    this.sendMail({
        subject: subject,
        templateName: templateName,
        data: data,
        to: user.email
    }, callback);
};

/**
 * Doesn't actually send "from" user, but sends from fromAddress w/ replyTo of user.email and
 * alias of user.displayName
 * @param subject
 * @param templateName
 * @param {Object} data
 * @param {User} fromUser instance of user model
 * @param {string} to
 * @param {Function} callback
 */
Mailer.prototype.sendMailFromUser = function(subject, templateName, data, fromUser, to, callback){
    this.sendMail({
        subject: subject,
        templateName: templateName,
        data: data,
        replyTo: fromUser.email,
        fromAlias: fromUser.displayName,
        to: to
    }, callback);
};