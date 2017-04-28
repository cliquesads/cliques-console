'use strict';
var init = require('../config/init')();
var request = require('request');
var parser = require('cron-parser');
var querystring = require('querystring');
var moment = require('moment-timezone');
var csvWriter = require('csv-write-stream');
var mail = require('../app/controllers/mailer.server.controller');
var _ = require('lodash');

require('../app/models/analytics.server.model');

var promise = require('bluebird');

var mailer = new mail.Mailer({ fromAddress: "no-reply@cliquesads.com" });
var BASE_URL = "https://console.cliquesads.com";

require('./_main')(function(GLOBALS) {
    var mongoose = GLOBALS.mongoose,
        Query = mongoose.model('Query'),
        User = mongoose.model('User'),
        Organization = mongoose.model('Organization');

    var getUrl = function(path, params) {
        params = params || {};
        var url = BASE_URL + path;
        if (params !== {}) {
            url = url + '?' + querystring.stringify(params);
        }
        return url;
    };

    var getTimePeriod = function(dateRangeShortCode, humanizedDateRange) {
        var timezone = 'America/Los_Angeles';
        var startDate, endDate;
        switch (dateRangeShortCode) {
            case "7d":
                startDate = moment().tz(timezone).add(1, 'days').startOf('day').subtract(6, 'days').toISOString();
                endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
                break;
            case "30d":
                startDate = moment().tz(timezone).add(1, 'days').startOf('day').subtract(29, 'days').toISOString();
                endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
                break;
            case "90d":
                startDate = moment().tz(timezone).add(1, 'days').startOf('day').subtract(89, 'days').toISOString();
                endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
                break;
            case "lastMonth":
                startDate = moment().tz(timezone).subtract(1, 'months').startOf('month').toISOString();
                endDate = moment().tz(timezone).startOf('month').startOf('day').toISOString();
                break;
            case "mtd":
                startDate = moment().tz(timezone).startOf('month').startOf('day').toISOString();
                endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
                break;
            case "yesterday":
                startDate = moment().tz(timezone).subtract(1, 'days').startOf('day').toISOString();
                endDate = moment().tz(timezone).startOf('day').toISOString();
                break;
            case "today":
                startDate = moment().tz(timezone).startOf('day').toISOString();
                endDate = moment().tz(timezone).add(1, 'days').startOf('day').toISOString();
                break;
            case "custom":
                var dates = humanizedDateRange.split(' - ');
                startDate = dates[0];
                endDate = dates[1];
                break;
            default:
                break;

        }
        return {
            startDate: startDate,
            endDate: endDate
        };
    };

    var getRequestParams = function(query, organizationType) {
        var queryAPIUrl;
        if (organizationType === 'networkAdmin') {
            queryAPIUrl = '/api/hourlyadstat';
        } else if (organizationType === 'advertiser') {
            queryAPIUrl = '/api/hourlyadstat/advSummary';
        } else if (organizationType === 'publisher') {
            queryAPIUrl = '/api/hourlyadstat/pubSummary';
        }
        var dateRanges = getTimePeriod(query.dateRangeShortCode, query.humanizedDateRange);
        var queryParam = {
            dateGroupBy: query.dateGroupBy,
            startDate: dateRanges.startDate,
            endDate: dateRanges.endDate,
            groupBy: query.groupBy,
        };

        var advertiserIds = [],
        publisherIds = [];
        
        query.filters.forEach(function(filterString) {
            if (filterString.startsWith('advertiser')) {
                advertiserIds.push(filterString.replace('advertiser'));
            } else if (filterString.startsWith('publisher')) {
                publisherIds.push(filterString.replace('publisher'));
            } else if (filterString.startsWith('campaign')) {
                queryParam.campaign = filterString.replace('campaign', '');
            } else if (filterString.startsWith('site')) {
                queryParam.campaign = filterString.replace('site', '');
            }
        });
        if (advertiserIds.length >= 1) {
            if (advertiserIds.length === 1) {
                queryParam.advertiser = advertiserIds[0];
            } else {
                queryParam.advertiser = '{in}' + advertiserIds.join(',');
            }
        }
        if (publisherIds.length >= 1) {
            if (publisherIds.length === 1) {
                queryParam.publisher = publisherIds[0];
            } else {
                queryParam.publisher = '{in}' + publisherIds.join(',');
            }
        }

        if (query.type !== 'time') {
            queryParam.populate = query.type;
        }

        return {
            auth: {
                user: GLOBALS.args.username,
                pass: GLOBALS.args.password
            },
            url: getUrl(queryAPIUrl, queryParam),
            jar: false // to enable sessions
        };
    };

    var formatRow = function(row, queryType, groupBy) {
        if (row._id) {
            if (queryType === 'time') {
                row[queryType] = row._id.date.month + "/" + row._id.date.day + "/" + row._id.date.year;
            } else {
                row[queryType] = row._id[queryType].name;
            }
        }
        row.Impressions = row.imps;
        row.Spend = '$' + row.spend.toFixed(2);
        row.CPM = row.imps ? ('$' + ((row.spend / row.imps) * 1000).toFixed(2)) : 'NaN';
        row.CTR = row.imps ? (((row.clicks / row.imps) * 100).toFixed(3) + '%') : 'NaN';
        row['Fill Rate'] = (row.imps + row.defaults) ? (((row.imps / (row.imps + row.defaults)) * 100).toFixed(1) + '%') : 'NaN';
        row['Total Actions'] = row.view_convs + row.click_convs;
        row.Clicks = row.clicks;
        row.CPC = row.clicks ? (row.spend / row.clicks, '$', 2) : 'NaN';
        row.Bids = row.bids;
        row.Uniques = row.uniques;
        row['View-Through Actions'] = row.view_convs;
        row['Click-Through Actions'] = row.click_convs;
        row.CPAV = row.view_convs ? (row.spend / row.view_convs, '$', 2) : 'NaN';
        row.CPAC = row.click_convs ? (row.spend / row.click_convs, '$', 2) : 'NaN';
        row.CPA = (row.view_convs + row.click_convs) ? (row.spend / (row.view_convs + row.click_convs), '$', 2) : 'NaN';
        row.RPM = row.imps ? row.spend / row.imps * 1000 : 'NaN';
        row.Defaults = row.defaults;
        row.RPAV = row.view_convs ? (row.spend / row.view_convs, '$', 2) : 'NaN';
        row.RPAC = row.click_convs ? (row.spend / row.click_convs, '$', 2) : 'NaN';
        row.RPA = (row.view_convs + row.click_convs) ? (row.spend / (row.view_convs + row.click_convs), '$', 2) : 'NaN';
        row['Fill Rate'] = row.defaults ? row.imps / row.defaults : 'NaN';
        row.RPC = row.clicks ? (row.spend / row.clicks, '$', 2) : 'NaN';

        return row;
    };

    var sortByDate = function(a, b) {
        if (a._id && b._id) {
            var aDate = new Date(a._id.date.year, a._id.date.month - 1, a._id.date.day);
            var bDate = new Date(b._id.date.year, b._id.date.month - 1, b._id.date.day);
            return aDate - bDate;
        } else {
            return;
        }
    };

    var generateReport = function(
        queryOpts,
        emailSubject,
        toEmail,
        emailTemplate,
        headers,
        asOfDate,
        organizationWebsite,
        query
    ) {
        // create csv write stream
        var csv = csvWriter({ headers: headers });
        // send request
        request.promisifiedGet = promise.promisify(request.get);
        return request.promisifiedGet(queryOpts)
        .then(function(response) {
            var rows = JSON.parse(response.body);

            // sort rows by date
            rows = rows.sort(sortByDate);

            // calculate totals, store in separate object
            var totals = {
                imps: _.sumBy(rows, function(r) {
                    return r.imps;
                }),
                defaults: _.sumBy(rows, function(r) {
                    return r.defaults;
                }),
                spend: _.sumBy(rows, function(r) {
                    return r.spend;
                }),
                clicks: _.sumBy(rows, function(r) {
                    return r.clicks;
                })
            };
            totals = formatRow(totals, query.type, query.groupBy);

            // Now calculate derived fields and format (template engine
            // doesn't handle formatting filters)

            rows.forEach(function(row) {
                row = formatRow(row, query.type, query.groupBy);
                // write to csv as well, only picking headers passed in
                csv.write(_.pick(row, headers));
            });

            // end csv stream
            csv.end();
            var csvName = query.name + '_' + asOfDate.substring(0, 10) + '_report.csv';

            // now send mail
            mailer.promisifiedSendMail = promise.promisify(mailer.sendMail);
            return mailer.promisifiedSendMail({
                subject: emailSubject,
                templateName: emailTemplate,
                to: toEmail,
                attachments: [{
                    filename: csvName,
                    content: csv
                }],
                data: {
                    placementData: rows,
                    totals: totals,
                    asOfDate: asOfDate,
                    organizationWebsite: organizationWebsite,
                    dateRange: query.humanizedDateRange,
                    tableHeaders: headers
                }
            });
        })
        .catch(function(err) {
            console.error(err);
        });
    };

    var asOfDate = moment().tz('America/New_York').startOf('day').subtract(1, 'days').toISOString();
    Query.promisifiedFind = promise.promisify(Query.find);
    // Find all queries from database and check if any of them are saved as periodic queries and are due at the moment
    return Query.promisifiedFind({
        schedule: {
            $exists: true,
            $ne: null
        }
    })
    .then(function(scheduledQueries) {
        return promise.each(scheduledQueries, function(query) {
            if (query.schedule) {
                // This query is saved as a periodic query
                var now = new Date();
                var nextRunForQuery = new Date(query.nextRun);

                var toEmail;
                
                if (nextRunForQuery < now) {
                    // The next execution time for this query is overdue
                    // 1. Update the `nextRun` field for this query in database
                    // 2. Run this query and generate csv report
                    var interval = parser.parseExpression(query.schedule);
                    var nextRun = new Date(interval.next().toString());
                    while (nextRun < now) {
                        nextRun = new Date(interval.next().toString());
                    }
                    query.nextRun = nextRun;
                    query.promisifiedSave = promise.promisify(query.save);
                    return query.promisifiedSave()
                    .then(function() {
                        User.promisifiedFindOne = promise.promisify(User.findOne);
                        return User.promisifiedFindOne({
                            _id: query.user
                        });
                    })
                    .then(function(user) {
                        toEmail = user.email;
                        Organization.promisifiedFindOne = promise.promisify(Organization.findOne);
                        return Organization.promisifiedFindOne({
                            _id: user.organization
                        });
                    })
                    .then(function(organization) {
                        var orgType;
                        if (organization.organization_types.indexOf('networkAdmin') > -1) {
                            orgType = 'networkAdmin';
                        } else if (organization.organization_types.indexOf('advertiser') > -1) {
                            orgType = 'advertiser';
                        } else if (organization.organization_types.indexOf('publisher') > -1) {
                            orgType = 'publisher';
                        }
                        var organizationWebsite = organization.website;
                        return generateReport(
                            getRequestParams(query, orgType),
                            'Cliques Periodic Report',
                            toEmail,
                            'cron-report-email.server.view.html',
                            query.dataHeaders,
                            asOfDate,
                            organizationWebsite,
                            query
                        );
                    })
                    .catch(function(err) {
                        console.error(err);
                    });
                }
            }
        });
    })
    .then(function() {
        mongoose.disconnect();
    })
    .catch(function(err) {
        mongoose.disconnect();
        console.error(err);
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
