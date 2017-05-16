'use strict';
var init = require('../config/init')();
var request = require('request');
var parser = require('cron-parser');
var moment = require('moment-timezone');
var csvWriter = require('csv-write-stream');
var mail = require('../app/controllers/mailer.server.controller');
var _ = require('lodash');
var base64 = require('base64-stream');
var promise = require('bluebird');

var mailer = new mail.Mailer({
    fromAddress: "no-reply@cliquesads.com",
    templatePath: __dirname + '/../app/views/templates'
});
var BASE_URL;

require('./_main')(function(GLOBALS) {
    var config = GLOBALS.cliques_config;
    if (process.env.NODE_ENV === 'local-test') {
        BASE_URL = 'http://' + config.get('Console.http.external.hostname') + ':' + config.get('Console.http.external.port');
    } else {
        BASE_URL = 'https://' + config.get('Console.https.external.hostname');
    }

    var mongoose = GLOBALS.mongoose;
    require('../app/models/analytics.server.model');
    require('../app/models/organization.server.model');
    var Query = mongoose.model('Query');

    var sortByDate = function(a, b) {
        var aDate, bDate;
        if (a._id.date.day && a._id.date.hour) {
            aDate = new Date(a._id.date.year, a._id.date.month-1, a._id.date.day, a._id.date.hour, 0, 0);
            bDate = new Date(b._id.date.year, b._id.date.month-1, b._id.date.day, b._id.date.hour, 0, 0);
        } else if (a._id.date.day) {
            aDate = new Date(a._id.date.year, a._id.date.month-1, a._id.date.day);
            bDate = new Date(b._id.date.year, b._id.date.month-1, b._id.date.day);
        } else {
            aDate = new Date(a._id.date.year, a._id.date.month-1);
            bDate = new Date(b._id.date.year, b._id.date.month-1);
        }
        return aDate - bDate;
    };

    var generateReport = function(
        queryOpts,
        emailSubject,
        toEmail,
        emailTemplate,
        headers,
        asOfDate,
        query,
        tz
    ) {
        // create csv write stream
        var csv = csvWriter({ headers: headers });
        // send request
        request.promisifiedGet = promise.promisify(request.get);
        return request.promisifiedGet(queryOpts)
        .then(function(response) {
            var rows = JSON.parse(response.body);
            if (rows.length > 0) {
                if (rows[0]._id.date) {
                    // sort rows by date
                    rows = rows.sort(sortByDate);
                }
            }

            rows.forEach(function(row) {
                // write each row to csv, only picking headers passed in
                csv.write(_.pick(row, headers));
            });

            // end csv stream
            csv.end();
            var csvName = query.name + '_' + asOfDate.substring(0, 10) + '_report.csv';

            var queryModel = new Query(query);
            var timePeriod = queryModel.getDatetimeRange(tz);

            // reformat timezone-aware dates to be user-friendly in the email
            function formatTzDate(isoString){
                return moment.tz(isoString, tz).format('MMMM D, YYYY h:mmA z');
            }
            var startDate = formatTzDate(timePeriod.startDate);
            var endDate = formatTzDate(timePeriod.endDate);

            // now send mail
            mailer.promisifiedSendMail = promise.promisify(mailer.sendMail);
            return mailer.promisifiedSendMail({
                subject: emailSubject,
                templateName: emailTemplate,
                to: toEmail,
                attachments: [{
                    type: 'text/csv',
                    filename: csvName,
                    content: csv
                }],
                // TODO: Populate queryUrl in data w/ URL of query, when UI routing refactor is finished
                data: {
                    dateRange: query.humanizedDateRange,
                    queryName: query.name,
                    startDate: startDate,
                    queryUrl: BASE_URL + "#!/analytics/my-queries/" + query.id,
                    endDate: endDate
                }
            });
        })
        .catch(function(err) {
            console.error(err);
        });
    };

    var asOfDate = moment().startOf('day').subtract(1, 'days').toISOString();
    // Find all queries with schedule, populate user and organization as well and check if any of them are due for the nextRun at the time being
    return Query.find({
        schedule: {
            $exists: true,
            $ne: null
        }
    })
    .populate({
        path: 'user',
        populate: {
            path: 'organization'
        }
    })
    .then(function(scheduledQueries) {
        return promise.each(scheduledQueries, function(query) {
            // This query is saved as a periodic query
            var now = new Date();
            var nextRunForQuery = new Date(query.nextRun);

            if (nextRunForQuery < now) {
                var toEmail = query.user.email;
                var tz = query.user.tz;

                // The next execution time for this query is overdue
                // 1. Update the `nextRun` field for this query in database
                // 2. Run this query and generate csv report
                var interval = parser.parseExpression(query.schedule, {utc: true});
                var nextRun = new Date(interval.next().toString());
                while (nextRun < now) {
                    nextRun = new Date(interval.next().toString());
                }
                query.nextRun = nextRun;
                return query.save()
                .then(function() {
                    var orgType = query.user.organization.effectiveOrgType;
                    var subject = "Cliques Query Results - " + query.name + " - " + moment(asOfDate).format('MMMM D, YYYY');
                    var queryModel = new Query(query);
                    return generateReport(
                        {
                            auth: {
                                user: GLOBALS.args.username,
                                pass: GLOBALS.args.password
                            },
                            url: BASE_URL + queryModel.getUrl(orgType),
                            jar: false // to enable sessions
                        },
                        subject,
                        toEmail,
                        'cron-report-email.server.view.html',
                        query.dataHeaders,
                        asOfDate,
                        query,
                        tz
                    );
                })
                .catch(function(err) {
                    console.error(err);
                });
            }
        });
    })
    .then(function() {
        mongoose.disconnect();
        process.exit(0);
    })
    .catch(function(err) {
        mongoose.disconnect();
        console.error(err);
        process.exit(1);
    });
}, [
    [
        ['-u', '--username'],
        { help: 'Username' }
    ],
    [
        ['-p', '--password'],
        { help: 'Password' }
    ]
]);
