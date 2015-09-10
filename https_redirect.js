var express = require('express');
var http = require('http');
var redirectApp = express();
var redirectServer = http.createServer(redirectApp);

var GCLB_USERAGENT = new RegExp('^Google-GCLB.*');

redirectApp.use(function requireHTTPS(req, res, next) {
    if (GCLB_USERAGENT.exec(req.headers['user-agent'])){
        console.log('GCLB Request - Status 200');
        res.status(200).send();
    } else {
        if (!req.secure) {
            return res.redirect('https://' + req.headers.host + req.url);
        }
        next();
    }
});
redirectServer.listen(8080);