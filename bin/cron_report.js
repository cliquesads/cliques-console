'use strict';
var init = require('../config/init')();
var config = require('../config/config');
var request = require('request');
var util = require('util');
var parser = require('cron-parser');
var querystring = require('querystring');
var moment = require('moment-timezone');
var csvWriter = require('csv-write-stream');
var mail = require('../app/controllers/mailer.server.controller');
var _ = require('lodash');
var mongoose = require('mongoose');
var Query = mongoose.model('Query');
var User = mongoose.model('User');
var promise = require('bluebird');

var mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });
var BASE_URL = "https://console.cliquesads.com";

function getUrl(path, params){
    params = params || {};
    var url = BASE_URL + path;
    if (params !== {}){
        url = url + '?' + querystring.stringify(params);
    }
    return url;
}

function getStartDateAndEndDateForQuery(queryHumanizedDateRange) {
	var timezone = 'America/Los_Angeles';
	var startDate, endDate;
	switch(queryHumanizedDateRange) {
		case "Last 7 Days":
			startDate = moment().tz(timezone).add(1,'days').startOf('day').subtract(6, 'days').toISOString();
			endDate = moment().tz(timezone).add(1,'days').startOf('day').toISOString();
			break;
		case "Last 30 Days":
			startDate = moment().tz(timezone).add(1,'days').startOf('day').subtract(29, 'days').toISOString();
			endDate = moment().tz(timezone).add(1,'days').startOf('day').toISOString();
			break;
		case "Last 90 Days":
			startDate = moment().tz(timezone).add(1,'days').startOf('day').subtract(89, 'days').toISOString();
			endDate = moment().tz(timezone).add(1,'days').startOf('day').toISOString();
			break;
		case "Last Month":
			startDate = moment().tz(timezone).subtract(1,'months').startOf('month').toISOString();
			endDate = moment().tz(timezone).startOf('month').startOf('day').toISOString();
			break;
		case "Month to Date":
			startDate = moment().tz(timezone).startOf('month').startOf('day').toISOString();
			endDate = moment().tz(timezone).add(1,'days').startOf('day').toISOString();
			break;
		case "Yesterday":
			startDate = moment().tz(timezone).subtract(1,'days').startOf('day').toISOString();
			endDate = moment().tz(timezone).startOf('day').toISOString();
			break;
		case "Today":
			startDate = moment().tz(timezone).startOf('day').toISOString();
			endDate = moment().tz(timezone).add(1,'days').startOf('day').toISOString();
			break;
		default:
			break;

	}
	return {
		startDate: startDate,
		endDate: endDate
	};
}

function getRequestParams(query) {
	var dateRanges = getStartDateAndEndDateForQuery(query.humanizedDateRange);
	return {
		auth: {
			user: process.argv[2],
			pass: process.argv[3]
		},
		url: getUrl("/api/hourlyadstat", {
			dateGroupBy: query.dateGroupBy,
			startDate: dateRanges.startDate,
			endDate: dateRanges.endDate,
			groupBy: query.groupBy,
			filters: query.filters
		}),
		jar: false // to enable sessions
	};
}

function fillRate(row){
    return ((row.imps / (row.imps + row.defaults)) * 100).toFixed(1) + '%';
}

function CTR(row){
    return ((row.clicks / row.imps) * 100).toFixed(3) + '%';
}

function CPM(row){
    return '$' + ((row.spend / row.imps) * 1000).toFixed(2);
}

function formatRow(row){
    row.CPM = CPM(row);
    row.spend = '$' + row.spend.toFixed(2);
    row.fillRate = fillRate(row);
    row.CTR = CTR(row);
    return row;
}

function sortByDate(a, b){
    var aDate = new Date(a._id.date.year, a._id.date.month-1, a._id.date.day);
    var bDate = new Date(b._id.date.year, b._id.date.month-1, b._id.date.day);
    return aDate - bDate;
}

function generateReport(queryOpts, emailSubject, toEmail, emailTemplate, headers, asOfDate, callback){
    // create csv write stream
    var csv = csvWriter({headers: headers});
    // send request
    request.get(queryOpts, function(err, response, body){
        if (err) return callback(err);
        var rows = JSON.parse(body);

        // sort rows by date
        rows = rows.sort(sortByDate);

        // calculate totals, store in separate object
        var totals = {
            imps: _.sumBy(rows, function(r){ return r.imps; }),
            defaults: _.sumBy(rows, function(r){ return r.defaults; }),
            spend: _.sumBy(rows, function(r){ return r.spend; }),
            clicks: _.sumBy(rows, function(r){ return r.clicks; })
        };
        totals = formatRow(totals);

        // Now calculate derived fields and format (template engine
        // doesn't handle formatting filters)
        rows.forEach(function(row){
            row.date = row._id.date.month + "/" + row._id.date.day + "/" + row._id.date.year;
            row.placement = row._id.placement.name;
            formatRow(row);
            // write to csv as well, only picking headers passed in
            csv.write(_.pick(row, headers));
        });

        // end csv stream
        csv.end();
        var csvName = asOfDate + '_report.csv';

        // now send mail
        mailer.sendMail({
            subject: emailSubject,
            templateName: emailTemplate,
            to: toEmail,
            attachments: [
                {
                    filename: csvName,
                    content: csv
                }
            ],
            data: {placementData: rows, totals: totals, asOfDate: asOfDate}
        }, function(err, sent){
            if (err) {
                console.error(err);
                return callback(err);
            }
            return callback();
        });
    });
}

var asOfDate = moment().tz('America/New_York').startOf('day').subtract(1, 'days').toISOString();

// Build the connection string
var exchangeMongoURI = util.format('mongodb://%s:%s/%s',
    config.mongodb.host,
    config.mongodb.port,
    config.mongodb.db);

var exchangeMongoOptions = {
    user: config.mongodb.user,
    pass: config.mongodb.pwd,
    auth: {authenticationDatabase: config.mongodb.db}
};
var connection = mongoose.createConnection(exchangeMongoURI, exchangeMongoOptions);
connection.on('connected', function() {
	var promisifiedFind = promise.promisify(Query.find);
    // Find all queries from database and check if any of them are saved as periodic queries and are due at the moment
	Query.promisifiedFind({})
	.then(function(allQueries) {
        return promise.each(allQueries, function(query) {
            if (query.schedule) {
                // This query is saved as a periodic query
                var now = new Date();
                var nextRunForQuery = new Date(query.nextRun);
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
                    return query.save()
                    .then(function() {
                        User.promisifiedFindOne = promise.promisify(User.findOne);
                        return User.promisifiedFindOne({
                            _id: query.user
                        })
                    })
                    .then(function(user) {
                        var toEmail = user.email;
                        generateReport(
                            getRequestParams(query),
                            'Cliques Periodic Report',
                            toEmail,
                            'outdoorProject-email.server.view.html',
                            ['date','placement','spend','imps','clicks','fillRate','CTR','CPM'],
                            asOfDate,
                            null
                        );
                    })
                    .catch(function(err) {
                        console.error(err);
                    });
                }
            }
        });
	})
	.catch(function(err) {
		console.error(err);
		connection.close();
	});
});
