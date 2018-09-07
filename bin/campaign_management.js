/**
 * Script to be run HOURLY that currently:
 *
 * 1) Deactivates any campaigns that have passed their expiration date
 * ### IMPORTANT: All start & end dates are saved as naive datetimes in
 * ### Mongo & are interpreted AS UTC.
 * ### Thus, current behavior is to run on the hour, & deactivate any campaigns
 * ### w/ end_dates that have occurred in the past
 */

require('./_main')(function(GLOBALS) {
    const request = require('request'),
        chalk = require('chalk'),
        async = require('async'),
        mail = require('../app/controllers/mailer.server.controller'),
        mailer = new mail.Mailer({ templatePath: __dirname + '/../app/views/templates' }),
        promise = require('bluebird');

    const models = GLOBALS.cliques_mongo.models,
        db = GLOBALS.db,
        config = GLOBALS.cliques_config;

    const mongoose = GLOBALS.mongoose;
    mongoose.Promise = promise;

    // Get base API url. Use secure in dev / prod, non-secure in local-test
    let BASE_API_URL;
    if (process.env.NODE_ENV === 'local-test') {
        BASE_API_URL = 'http://' + config.get('Console.http.external.hostname') +
            ':' + config.get('Console.http.external.port');
    } else {
        BASE_API_URL = 'https://' + config.get('Console.https.external.hostname');
    }

    const advertiserModels = new models.AdvertiserModels(db);

    /**
     * Deactivates campaigns with a UTC `end_date` in [start, end) open range,
     * and returns promise that resolves with { errAndSuccess } object, where
     *
     * ```
     * {
     *    success: [ <array of campaigns that were deactivated successfully> ],
     *    error: [ <array of error objects (see below)]
     * }
     * ```
     *
     * An error object represents a single campaign that threw an error when
     * deactivate API endpoint was called:
     *
     * ```
     * {
     *     campaign: campaign,
     *     message: response.body,
     *     statusCode: response.statusCode,
     *     statusMessage: response.statusMessage
     * }
     * ```
     *
     * @param start Date object for start of range (inclusive)
     * @param end Date object to end range (exclusive)
     */
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
            // TODO: wanted to use promise .each() instead to iterate over campaigns
            // TODO: but couldn't get the flow right. Would be a lot cleaner than this,
            // TODO: which essentially is just a promise wrapping an async.each() instead.

            // now send request to API to deactivate campaign
            return new promise((resolve, reject) => {
                const errorCampaigns = [],
                    successCampaigns = [];
                async.each(campaigns, (campaign, callback) => {
                    const url = `${BASE_API_URL}/api/advertiser/${campaign.__parent.id}/campaign/${campaign.id}/deactivate`;
                    console.log(`Sending PUT request to ${url}...`);
                    request({
                        auth: {
                            user: GLOBALS.args.username,
                            pass: GLOBALS.args.password
                        },
                        method: "PUT",
                        url: url,
                        jar: false // to enable sessions
                    }, (err, response) => {
                        // If uncaught error, callback with error
                        if (err){
                            return callback(err);
                        }
                        // to be safe wrap in try catch in case some weird HTTP object
                        // is returned w/o expected properties. Otherwise error won't be caught
                        try {
                            // if HTTP error occurs (i.e. statusCode not 200),
                            // Don't callback with error but actually add
                            // pseudo-error-like info object to errors
                            // array, which will be returned in resolve();
                            if (response.statusCode !== 200){
                                const httpError = {
                                    campaign: campaign,
                                    message: response.body,
                                    statusCode: response.statusCode,
                                    statusMessage: response.statusMessage
                                };

                                // Log error for posterity's sake
                                console.error(chalk.red(`Error deactivating campaign ${httpError.campaign.id}: Status ${httpError.statusCode} - ${httpError.message}`));

                                // add to errorCampaigns array, which will be passed to resolve();
                                errorCampaigns.push(httpError);
                            } else {
                                console.log(`Successfully deactivated campaign ID ${campaign.id}: Status ${response.statusCode} - ${response.statusMessage}`);
                                successCampaigns.push(campaign);
                            }
                            callback();
                        } catch(e){
                            callback(e);
                        }
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

    /**
     * Activates campaigns with a UTC `end_date` in [start, end) open range,
     * and returns promise that resolves with { errAndSuccess } object, where
     *
     * ```
     * {
     *    success: [ <array of campaigns that were deactivated successfully> ],
     *    error: [ <array of error objects (see below)]
     * }
     * ```
     *
     * An error object represents a single campaign that threw an error when
     * deactivate API endpoint was called:
     *
     * ```
     * {
     *     campaign: campaign,
     *     message: response.body,
     *     statusCode: response.statusCode,
     *     statusMessage: response.statusMessage
     * }
     * ```
     *
     * @param start Date object for start of range (inclusive)
     * @param end Date object to end range (exclusive)
     */
    function activateQueuedCampaigns(start, end){
        // TODO: Plug in promise lib to Mongoose globally and this goes away
        // const promisifiedFind = promise.promisify(advertiserModels.Advertiser.find);
        return advertiserModels.Advertiser.find({
            'campaigns': {
                '$elemMatch': {
                    'start_date': {
                        '$gte': start,
                        '$lt': end
                    }
                }
            }
        })
        .then((advertisers) => {
            let campaignsToActivate = [];
            advertisers.forEach((adv) => {
                const temp = adv.campaigns.filter((campaign) => {
                    return (start <= campaign.start_date && campaign.start_date < end);
                });
                campaignsToActivate = campaignsToActivate.concat(temp);
            });
            return campaignsToActivate;
        })
        .then((campaigns) => {
            // TODO: wanted to use promise .each() instead to iterate over campaigns
            // TODO: but couldn't get the flow right. Would be a lot cleaner than this,
            // TODO: which essentially is just a promise wrapping an async.each() instead.

            // now send request to API to deactivate campaign
            return new promise((resolve, reject) => {
                const errorCampaigns = [],
                    successCampaigns = [];
                async.each(campaigns, (campaign, callback) => {
                    const url = `${BASE_API_URL}/api/advertiser/${campaign.__parent.id}/campaign/${campaign.id}/activate`;
                    console.log(`Sending PUT request to ${url}...`);
                    request({
                        auth: {
                            user: GLOBALS.args.username,
                            pass: GLOBALS.args.password
                        },
                        method: "PUT",
                        url: url,
                        jar: false // to enable sessions
                    }, (err, response) => {
                        // If uncaught error, callback with error
                        if (err){
                            return callback(err);
                        }
                        // to be safe wrap in try catch in case some weird HTTP object
                        // is returned w/o expected properties. Otherwise error won't be caught
                        try {
                            // if HTTP error occurs (i.e. statusCode not 200),
                            // Don't callback with error but actually add
                            // pseudo-error-like info object to errors
                            // array, which will be returned in resolve();
                            if (response.statusCode !== 200){
                                const httpError = {
                                    campaign: campaign,
                                    message: response.body,
                                    statusCode: response.statusCode,
                                    statusMessage: response.statusMessage
                                };

                                // Log error for posterity's sake
                                console.error(chalk.red(`Error activating campaign ${httpError.campaign.id}: Status ${httpError.statusCode} - ${httpError.message}`));

                                // add to errorCampaigns array, which will be passed to resolve();
                                errorCampaigns.push(httpError);
                            } else {
                                console.log(`Successfully activated campaign ID ${campaign.id}: Status ${response.statusCode} - ${response.statusMessage}`);
                                successCampaigns.push(campaign);
                            }
                            callback();
                        } catch(e){
                            callback(e);
                        }
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
                    }
                    console.log('Error email to support@cliquesads.com sent, exiting...');
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
                    }
                    console.log('Success email to support@cliquesads.com sent, exiting...');
                });
            }
        })
        .then(() => {return activateQueuedCampaigns(rangeStart, rangeEnd); })
        .then((errAndSuccess) => {
            const errorCampaigns = errAndSuccess.error;

            const successCampaigns = errAndSuccess.success;

            // if nothing happened, just quit.
            if (!errorCampaigns.length && !successCampaigns.length) {
                console.log(`No campaigns to activate for range ${rangeStart} to ${rangeEnd}. Peace!`);
                process.exit(0);
            }

            // if campaign deactivation errored for some campaigns, send email
            if (errorCampaigns.length) {
                mailer.sendMail({
                    subject: `Errors Activating Campaigns at ${now}`,
                    templateName: 'campaign-activated-error-email.server.view.html',
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
            if (successCampaigns.length) {
                mailer.sendMail({
                    subject: `Successfully Activated Campaigns at ${now}`,
                    templateName: 'campaign-activated-success-email.server.view.html',
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