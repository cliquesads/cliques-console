/* jshint node: true */
'use strict';
var mongoose = require('mongoose'),
    config = require('../../config/config'),
    cliquesConfig = require('config'),
    nodemailer = require('nodemailer'),
    EmailTemplates = require('swig-email-templates'),
    mandrill = require('mandrill-api'),
    _ = require('lodash');

var mandrillClient = new mandrill.Mandrill(cliquesConfig.get("Mandrill.apiKey"));

/**
 * Helper object to abstract away annoying low-level mail config duties
 * when sending emails.
 *
 * @type {Function}
 * @param {Object} [options]
 * @param {String} [options.mailerType=local] Either `'local'` (i.e. nodeMailer) or `'mandrill'` (uses Mandrill API).
 * @param {String} [options.fromAddress] can either be straight email address (me@me.com) or of the format "Me <me@me.com>". Default is config.mailer.from
 * @param {Object} [options.templatePath] path to directory containing template files. Default is '../views'
 * @param {Object} [options.mailerOptions] options to pass to nodemailer.createTransport or to pass to Mandrill.message. Default is config.mailer.options
 */
var Mailer = exports.Mailer = function(options){
    options             = options || {};
    this.fromAddress    = options.fromAddress || 'support@cliquesads.com';
    this.mailerType     = options.mailerType || 'local';
    this.templatePath   = options.templatePath || config.templatePath;

    this.smtpTransport  = nodemailer.createTransport(this.mailerOptions);
    if (this.mailerType === 'local'){
        // init email templates compiler, which uses Swig to compile templates
        // and Juice to take care of inlining all CSS to be compatible with email clients
        this.templateRenderer = new EmailTemplates({
            root: this.templatePath
        });
    } else if (this.mailerType === 'mandrill'){
        this.mandrillClient = mandrillClient;
    } else {
        throw Error('options.mailerType must be either local or mandrill');
    }

    //// Default to mailer options stored in environment config
    this.mailerOptions  = options.mailerOptions || config.mailer.options;

    //this.client = new postmark.Client(config.postmark.apiToken);
    this.defaults = {
        appName: config.app.title
    };
};

/**
 * Base method used to send mail.
 *
 * Depending on `mailer.mailerType`, will either use mandrill email client or local nodeMailer SMTP transport
 * to send email.
 *
 * 'to' value is passed directly to mailOptions 'to', so must be string or array of strings.
 *
 * NOTE: will extend mailOptions.data with Mailer.defaults, and set a template variable 'subject'
 * to mailOptions.subject
 *
 * @param {Object} mailOptions
 * @param {String} mailOptions.subject email subject
 * @param {String} mailOptions.templateName name of template file stored in self.templatePath, or name of template in Mandrill
 * @param {String} mailOptions.to passed directly to sendEmail 'to', so must be string or array of strings.
 * @param {Object} [mailOptions.data] data passed to template to compile
 * @param {String} [mailOptions.fromAlias] Can't set 'from' header w/ Gmail, but this at least changes the display to "[fromAlias] <support@cliquesads.com>"
 * @param {String} [mailOptions.replyTo] replyTo field
 * @param {Object} [mailOptions.mandrillOptions] Object with which mandrill `message` object is extended. Pass any
 *     message options through this object, like `attachments` or `images`. Any keys in this object will overwrite default
 *     `message` keys.
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
    if (self.mailerType === 'local'){
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
    } else if (self.mailerType === 'mandrill'){
        self._mandrillSendMail(mailOptions, callback);
    }
};

/**
 * Private sub-function to send email through Mandrill
 * @param mailOptions
 * @param callback
 * @private
 */
Mailer.prototype._mandrillSendMail = function(mailOptions, callback){
    var self = this;
    // set message default options here
    var message = {
        "subject": mailOptions.subject,
        "from_email": mailOptions.from,
        "from_name": mailOptions.fromAlias,
        // TODO: Take advantage of the fact that you can send
        // TODO: bulk emails in one request here
        "to": [{
            "email": mailOptions.to
        }],
        "headers": {
            "Reply-To": mailOptions.replyTo
        },
        // Set GLOBAL global merge vars here
        // For some fucked up reason, handlebars templates in Mandrill require that you
        // set template variables as this parameter and NOT as template_content, no fucking idea why.
        "global_merge_vars": [
            {
                "name": "CURRENT_YEAR",
                "content": new Date().getFullYear()
            }
        ],
        "merge_language": "handlebars"
    };

    // Convert mailOptions.data to format required by mandrill API
    var merge_vars = [];
    _.forOwn(mailOptions.data, function(val, key){
        merge_vars.push({
            "name": key,
            "content": val
        });
    });
    message.global_merge_vars = _.union(message.global_merge_vars, merge_vars);



    // Now extend message w/ options passed to mailOptions.mandrillOptions
    if (mailOptions.mandrillOptions){
        _.assignIn(message, mailOptions.mandrillOptions);
    }

    self.mandrillClient.messages.sendTemplate({
            "template_name": mailOptions.templateName,
            "template_content": [{}],
            "message": message
        },
        function(result){
            console.log(result);
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

/**
 * Sub-function which uses nodeMailer SMTP transport to send email.
 *
 * @param mailOptions
 * @param callback
 * @private
 */
Mailer.prototype._nodemailerSendMail = function(mailOptions, callback){
    var self = this;
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
    var Organization = mongoose.model('Organization');
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