var init = require('../config/init')();
var config = require('../config/config');
var request     = require('request');
var querystring = require('querystring');
var moment = require('moment-timezone');
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

var auth = {
    url: getUrl("/auth/signin"),
    body: {
        username: process.argv[2],
        password: process.argv[3]
    },
    json: true,
    jar: true // to enable sessions
};

var startDate = moment().tz('America/New_York').startOf('day').subtract(1, 'days').toISOString();
var endDate = moment().tz('America/New_York').startOf('day').toISOString();

// Now construct actual request API request options
var opts = {
    url: getUrl("/hourlyadstat", {
        dateGroupBy: "day",
        startDate: startDate,
        endDate: endDate,
        publisher: "56f01bd08d12055c591c110a",
        groupBy: "publisher,placement",
        populate: "publisher,placement"
    }),
    jar: true // to enable sessions
};

function fillRate(row){
    return (row.imps / (row.imps + row.defaults)).toFixed(3) * 100 + '%';
}

request.post(auth, function(error){
    if (error) return console.error(error);
    request.get(opts, function(err, response, body){
        if (err) return console.log(err);
        var rows = JSON.parse(body);
        var placementData = [];
        var totals = {
            imps: _.sumBy(rows, function(r){ return r.imps; }),
            defaults: _.sumBy(rows, function(r){ return r.defaults; }),
            spend: "$" + _.sumBy(rows, function(r){ return r.spend; }).toFixed(2)
        };
        rows.forEach(function(row){
            row.spend = '$' + row.spend.toFixed(2);
            row.fillRate = fillRate(row);
            placementData.push(row);
        });
        totals.fillRate = fillRate(totals);
        mailer.sendMail({
            subject: 'Cliques Daily Report - Gear Patrol',
            templateName: 'gearpatrol-email.server.view.html',
            to: 'elayton@gearpatrol.com',
            data: {placementData: placementData, totals: totals, startDate: startDate}
        }, function(err, sent){
            if (err) return console.error(err);
            process.exit(0);
        });
    });
});
