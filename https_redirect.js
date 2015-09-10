var express = require('express');
var http = require('http');
var redirectApp = express();
var redirectServer = http.createServer(redirectApp);

var GCLB_USERAGENT = new RegExp('^Google-GCLB.*');

redirectApp.use(function requireHTTPS(req, res, next) {
    if (!req.secure) {
        return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
});
redirectServer.listen(3000);