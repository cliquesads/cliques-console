/**
 * Script to be run HOURLY that currently:
 *
 * 1) Checks if fill rate is below a certain threshold (set in config). If so, send alert email, otherwise
 *  do nothing.
 */
require('./_main')(function(GLOBALS) {
    const request = require('request'),
        chalk = require('chalk'),
        mail = require('../app/controllers/mailer.server.controller'),
        mailer = new mail.Mailer({templatePath: __dirname + '/../app/views/templates'}),
        promise = require('bluebird');

    const config = GLOBALS.cliques_config;

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

    /**
     * Gets basic, ungrouped/unfiltered hourly ad stat data from API.
     *
     * @param start Date object for start of range (inclusive)
     * @param end Date object to end range (exclusive)
     */
    function getHourlyAdStatData(start, end){
        start = start.toISOString();
        end = end.toISOString();
        const url = `${BASE_API_URL}/api/hourlyadstats?startDate=${start}&endDate=${end}`;
        console.log(`Sending GET request to ${url}...`);
        const promisifiedRequest = promise.promisify(request);
        return promisifiedRequest({
            auth: {
                user: GLOBALS.args.username,
                pass: GLOBALS.args.password
            },
            method: "GET",
            url: url,
            jar: false // to enable sessions
        });
    }

    /**
     * Performs fill rate alert check, sends alert if fill rate has fallen below a threshold.
     * @param data
     * @param threshold
     * @param intervalStart
     */
    function doFillRateAlert(data, threshold, intervalStart){
        return new promise((resolve, reject) => {
            if (!data || data.length === 0){
                return reject('No data received, cannot perform fill rate alert.');
            }
            const fillRate = data[0].imps / (data[0].imps + data[0].defaults);
            if (fillRate < threshold){
                console.log(`Alert triggered, fill rate ${fillRate.toFixed(2) * 100}% < ${threshold.toFixed(2) * 100}% for hour ${intervalStart}.`);
                mailer.sendMail({
                    subject: `CLIQUES ALERT: Fill Rate Alert at ${now}`,
                    templateName: 'data-alert-email.server.view.html',
                    data: {
                        tstamp: now,
                        baseUrl: BASE_API_URL,
                        alertMessage: `Fill rate for hour ${intervalStart} was ${fillRate.toFixed(2) * 100}%, which is below the ${threshold.toFixed(2) * 100}% threshold.`
                    },
                    to: 'support@cliquesads.com'
                }, (err, success) => {
                    if (err) {
                        return reject(err);
                    }
                    console.log('Alert email to support@cliquesads.com sent, exiting...');
                    return resolve();
                });
            } else {
                console.log(`Fill rate ${fillRate.toFixed(2) * 100}% > ${threshold.toFixed(2) * 100}%, no alert triggered.`)
                return resolve();
            }
        });
    }

    // First get start/end dates for the query
    const now = new Date();
    // Dates are formatted using toISOString here so get non-UTC dates, as formatting method will convert to UTC
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(),now.getHours()-1,0,0);
    const rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(),now.getHours(),0,0);

    getHourlyAdStatData(rangeStart, rangeEnd).
        then(response => {
            // if HTTP error occurs (i.e. statusCode not 200),
            // Don't callback with error but actually add
            // pseudo-error-like info object to errors

            if (response.statusCode !== 200) {
                // Log error for posterity's sake
                throw new Error(`Error getting hourlyAdStat data: Status ${response.statusCode} - ${response.body}`);
            } else {
                return doFillRateAlert(JSON.parse(response.body), config.get('Alerts.minFillRate'), rangeStart);
            }
        })
        .then(() => {
            console.log('Alerts complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error(chalk.red(err.stack));
            mailer.sendMail({
                subject: `Data Alert Script Error at ${now}`,
                templateName: 'alert-script-email.server.view.html',
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