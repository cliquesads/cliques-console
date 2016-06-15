var init = require('../config/init')();
var config = require('../config/config');
var request     = require('request');
var querystring = require('querystring');
var async = require('async');
var moment = require('moment-timezone');
var csvWriter = require('csv-write-stream');
var mail = require('../app/controllers/mailer.server.controller');
var _ = require('lodash');

var mailer = new mail.Mailer({ fromAddress : "no-reply@cliquesads.com" });
var BASE_URL = "https://console.cliquesads.com";

function getUrl(path, params){
    params = params || {};
    var url = BASE_URL + path;
    if (params != {}){
        url = url + '?' + querystring.stringify(params);
    }
    return url;
}

var gearPatrolArgs = function(){
    var startDate = moment().tz('America/New_York').startOf('day').subtract(1, 'days').toISOString();
    var endDate = moment().tz('America/New_York').startOf('day').toISOString();
    // Now construct actual request API request options
    return {
        auth: {
            user: process.argv[2],
            pass: process.argv[3]
        },
        url: getUrl("/api/hourlyadstat", {
            dateGroupBy: "day",
            startDate: startDate,
            endDate: endDate,
            publisher: "56f01bd08d12055c591c110a",
            groupBy: "publisher,placement",
            populate: "publisher,placement"
        }),
        jar: false // to enable sessions
    };
};

var outdoorProjectOpts = function(){
    var startDate = moment().tz('America/Los_Angeles').startOf('day').subtract(8, 'days').toISOString();
    var endDate = moment().tz('America/Los_Angeles').startOf('day').toISOString();
    return {
        auth: {
            user: process.argv[2],
            pass: process.argv[3]
        },
        url: getUrl("/api/hourlyadstat", {
            dateGroupBy: "day",
            startDate: startDate,
            endDate: endDate,
            publisher: "57435d99aef72e2c57c3182c",
            groupBy: "publisher,placement",
            populate: "publisher,placement"
        }),
        jar: false // to enable sessions
    }
};

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


// --------------------------------- //
// ---- GENERATE & SEND REPORTS ---- //
// --------------------------------- //

var asOfDate = moment().tz('America/New_York').startOf('day').subtract(1, 'days').toISOString();
async.parallel([
    function(callback){
        generateReport(
            gearPatrolArgs(),
            'Cliques Daily Report - Gear Patrol',
            'elayton@gearpatrol.com',
            'gearpatrol-email.server.view.html',
            ['placement', 'imps','defaults','spend','fillRate'],
            asOfDate, callback
        );
    },
    function(callback){
        generateReport(
            outdoorProjectOpts(),
            'Cliques Daily Report - OutdoorProject.com',
            'dbuchanan@digitaltrends.com',
            'outdoorProject-email.server.view.html',
            ['date','placement','spend','imps','clicks','fillRate','CTR','CPM'],
            asOfDate, callback
        );
    }
], function(err){
    if (err) {
        console.error(err);
        process.exit(1);
    } else {
        console.log('Emails complete!');
        process.exit(0);
    }
});
