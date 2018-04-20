/**
 * Script to be run HOURLY that currently:
 *
 * 1) Deactivates any campaigns that have passed their expiration date
 * ### IMPORTANT: All start & end dates are saved as naive datetimes in
 * ### Mongo & are interpreted AS UTC.
 * ### Thus, current behavior is to run on the hour, & deactivate any campaigns
 * ### w/ end_dates that have occurred in the past
 */

'use strict';
const init = require('../config/init')(),
    request = require('request'),
    _ = require('lodash'),
    chalk = require('chalk'),
    async = require('async'),
    mail = require('../app/controllers/mailer.server.controller'),
    mailer = new mail.Mailer({ templatePath: __dirname + '/../app/views/templates' }),
    promise = require('bluebird');

require('./_main')(function(GLOBALS) {
    const models = GLOBALS.cliques_mongo.models,
        db = GLOBALS.db,
        config = GLOBALS.cliques_config;

    const mongoose = GLOBALS.mongoose;
    mongoose.Promise = promise;

    // Get base API url. Use secure in dev / prod, non-secure in local-test
    let BASE_API_URL = 'http://localhost:5000';
    // if (process.env.NODE_ENV === 'local-test') {
    //     BASE_API_URL = 'http://' + config.get('Console.http.external.hostname') +
    //         ':' + config.get('Console.http.external.port');
    // } else {
    //     BASE_API_URL = 'https://' + config.get('Console.https.external.hostname');
    // }

    const advertiserModels = new models.AdvertiserModels(db);

    function deactivateExpiredCampaigns(start, end){
        // TODO: Plug in promise lib to Mongoose globally and this goes away
        // const promisifiedFind = promise.promisify(advertiserModels.Advertiser.find);
        return advertiserModels.Advertiser.find({
            'campaigns': {
                '$elemMatch': {
                    'end_date': {
                        '$gte': start,
                        '$lt': end
                    }
                }
            }
        })
        .then((advertisers) => {
            let campaignsToDeactivate = [];
            advertisers.forEach((adv) => {
                const temp = adv.campaigns.filter((campaign) => {
                    return (start <= campaign.end_date && campaign.end_date < end);
                });
                campaignsToDeactivate = campaignsToDeactivate.concat(temp);
            });
            return campaignsToDeactivate;
        })
        .then((campaigns) => {
            // now send request to API to deactivate campaign
            return new promise((resolve, reject) =>{
                const errorCampaigns = [],
                    successCampaigns = [];
                async.each(campaigns, (campaign, callback) => {
                    request({
                        auth: {
                            user: GLOBALS.args.username,
                            pass: GLOBALS.args.password
                        },
                        method: "PUT",
                        url: `${BASE_API_URL}/api/advertiser/${campaign.__parent.id}/campaign/${campaign.id}/deactivate`,
                        jar: false // to enable sessions
                    }, (err, response) => {
                        // If uncaught error, callback with error
                        if (err){
                            return callback(err);
                        }
                        // if HTTP error occurs (i.e. statusCode not 200),
                        // Don't callback with error but actually add pseudo-error-like info object to errors
                        // array, which will be returned in resolve();
                        if (response.statusCode !== 200){
                            const httpError = {
                                campaign: campaign,
                                message: response.body,
                                statusCode: response.statusCode,
                                statusMessage: response.statusMessage
                            };
                            // Log error for posterity's sake
                            console.error(chalk.red(`Error deactivating campaign ${httpError.campaign.id}: 
                                Status ${httpError.statusCode} - ${httpError.message}`));
                            // add to errorCampaigns array, which will be passed to resolve();
                            errorCampaigns.push(httpError);
                        } else {
                            console.log(`Successfully deactivated campaign ID ${campaign.id}`);
                            console.log(`Response ${response.statusCode}`);
                            successCampaigns.push(successCampaigns);
                        }
                        callback();
                    });
                }, (err) => {
                    if (err){
                        reject(err);
                    } else {
                        resolve({
                            error: errorCampaigns,
                            success: successCampaigns
                        });
                    }
                });
            });
        });
    }

    // First get start/end dates for the query
    const now = new Date();
    // IMPORTANT: All start & end dates are saved as naive datetimes in Mongo & are interpreted AS UTC
    const rangeStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),now.getUTCHours()-1,0,0);
    const rangeEnd = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),now.getUTCHours(),0,0);


    // Run, and send appropriate emails on conditions.
    deactivateExpiredCampaigns(rangeStart, rangeEnd)
        .then((errAndSuccess) => {
            const errorCampaigns = errAndSuccess.error;
            const successCampaigns = errAndSuccess.success;
            // if nothing happened, just quit.
            if (!errorCampaigns.length && !successCampaigns.length){
                console.log(`No campaigns to deactivate for range ${rangeStart} to ${rangeEnd}. Peace!`);
                process.exit(0);
            }

            // if campaign deactivation errored for some campaigns, send email
            if (errorCampaigns.length){
                mailer.sendMail({
                    subject: `Errors Deactivating Campaigns at ${now}`,
                    templateName: 'campaign-deactivated-error-email.server.view.html',
                    data: {
                        tstamp: now,
                        errors: errorCampaigns
                    },
                    to: 'support@cliquesads.com'
                }, (err, success) => {
                    if (err) {
                        console.error(chalk.red(err));
                        return process.exit(1);
                    }
                    console.log('Error email to support@cliquesads.com sent, exiting...');
                    return process.exit(0);
                });
            }

            // otherwise, send success email
            if (successCampaigns.length){
                mailer.sendMail({
                    subject: `Successfully Deactivated Campaigns at ${now}`,
                    templateName: 'campaign-deactivated-success-email.server.view.html',
                    data: {
                        tstamp: now,
                        successCampaigns: successCampaigns
                    },
                    to: 'support@cliquesads.com'
                }, (err, success) => {
                    if (err) {
                        console.error(chalk.red(err));
                        return process.exit(1);
                    }
                    console.log('Success email to support@cliquesads.com sent, exiting...');
                    return process.exit(0);
                });
            }
        })
        .catch((err) => {
            console.error(chalk.red(err.stack));
            mailer.sendMail({
                subject: `Campaign Management Script Error at ${now}`,
                templateName: 'campaign-management-error-email.server.view.html',
                data: {
                    tstamp: now,
                    err: err
                },
                to: 'support@cliquesads.com'
            }, (err, success) => {
                if (err) {
                    console.error(chalk.red(err));
                    return process.exit(1);
                }
                console.log('Error email to support@cliquesads.com sent, exiting...');
                return process.exit(1);
            });
        });
},[
    [
        ['-u', '--username'],
        { help: 'Username' }
    ],
    [
        ['-p', '--password'],
        { help: 'Password' }
    ]
]);