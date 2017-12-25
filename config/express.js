/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var fs = require('fs'),
	http = require('http'),
	https = require('https'),
	express = require('express'),
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	session = require('express-session'),
	compress = require('compression'),
	methodOverride = require('method-override'),
	cookieParser = require('cookie-parser'),
	helmet = require('helmet'),
	passport = require('passport'),
	mongoStore = require('connect-mongo')({
		session: session
	}),
	flash = require('connect-flash'),
	requestIp = require('request-ip'),
	config = require('./config'),
	consolidate = require('consolidate'),
    responseTime = require('response-time'),
	path = require('path');

module.exports = function(db) {
	// Initialize express app
	var app = express();

	// Globbing model files
	config.getGlobbedFiles('./app/models/**/*.js').forEach(function(modelPath) {
		require(path.resolve(modelPath));
	});

	// Have to require users after models are loaded
	var users = require('../app/controllers/users.server.controller')(db);

	// Setting application local variables
	app.locals.title = config.app.title;
	app.locals.description = config.app.description;
	app.locals.keywords = config.app.keywords;
    app.locals.logoBucket = config.app.logoBucket;
	app.locals.helpScout = config.helpscout;
	app.locals.nativeSpecs = config.nativeSpecs;
	app.locals.deploymentMode = config.deploymentMode;
	app.locals.facebookAppId = config.facebook.clientID;
	app.locals.jsFiles = config.getJavaScriptAssets();
	app.locals.cssFiles = config.getCSSAssets();


	// ##########################################
	// ########## EXPRESS MIDDLEWARE ############
	// ##########################################

	// Passing the request url to environment locals
	app.use(function(req, res, next) {
		res.locals.url = req.protocol + '://' + req.headers.host + req.url;
		next();
	});

	// requestIp middleware to ease IP parsing
	// inside request-ip middleware handler
	app.use(function(req, res, next) {
		req.clientIp = requestIp.getClientIp(req); // on localhost > 127.0.0.1
		next();
	});

	// Should be placed before express.static
	app.use(compress({
		filter: function(req, res) {
			return (/json|text|javascript|css/).test(res.getHeader('Content-Type'));
		},
		level: 9
	}));

    // Set console version header in all requests
    app.use(function(req, res, next){
        res.set('console-version', config.version);
        next();
    });

	// Showing stack errors
	app.set('showStackError', true);

	// Set swig as the template engine
	app.engine('server.view.html', consolidate[config.templateEngine]);

	// Set views path and view engine
	app.set('view engine', 'server.view.html');
	app.set('views', './app/views');

    // Enable logger (morgan)
    app.use(morgan('dev'));

	// Environment dependent middleware
	if (process.env.NODE_ENV === 'dev') {
		// Disable views cache
		app.set('view cache', false);
	} else if (process.env.NODE_ENV === 'production') {
		app.locals.cache = 'memory';
	}

	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser({ limit: "50mb"}));
	app.use(bodyParser.urlencoded({
		limit: "50mb",
		extended: true
	}));
	app.use(bodyParser.json({ limit: "50mb" }));
	app.use(methodOverride());

    // Adds response time to response headers
    app.use(responseTime());

    // CookieParser should be above session
	app.use(cookieParser());

	// Express MongoDB session storage
	app.use(session({
		saveUninitialized: true,
		resave: true,
		secret: config.sessionSecret,
		store: new mongoStore({
            mongooseConnection: db,
			collection: config.sessionCollection
		})
	}));

	// use passport session
	app.use(passport.initialize());
	app.use(passport.session());

	// connect flash for flash messages
	app.use(flash());

	// Use helmet to secure Express headers
	app.use(helmet.xframe());
	app.use(helmet.xssFilter());
	app.use(helmet.nosniff());
	app.use(helmet.ienoopen());
	app.disable('x-powered-by');

	// Setting the app router and static folder
	app.use(express.static(path.resolve('./public')));


	// ######################################
	// ############## ROUTERS ###############
	// ######################################

	// Router for unprotected endpoints.
	var noAuthRouter = exports.noAuthRouter = express.Router();

	// router for all protected API methods requiring authentication
	var apiRouter = exports.basicAuthRouter = express.Router();

	// register authentication methods for two API roots
	app.use('/console', users.requiresLogin);
	app.use('/api', passport.authenticate('basic', { session: false }));

	// 'console' endpoint requires login via POST, authenticates using local strategy
	app.use('/console', apiRouter);
	// 'api' endpoint is for developer API, authenticates w/ basic auth strategy
	app.use('/api', apiRouter);
	// noAuth router is for unprotected endpoints like organization creation, password reset, etc.
	app.use('/', noAuthRouter);

	// wrap in object to pass to routing files
	var routers = {
		apiRouter: apiRouter,
		noAuthRouter: noAuthRouter
	};

	// Globbing routing files
	config.getGlobbedFiles('./app/routes/**/*.js').forEach(function(routePath) {
		require(path.resolve(routePath))(db, routers);
	});

	// ######################################
	// ########### ERROR HANDLERS ###########
	// ######################################

	// Assume 'not found' in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
	app.use(function(err, req, res, next) {
		// If the error object doesn't exists
		if (!err) return next();

		// Log it
		console.error(err.stack);

		// Error page
		res.status(500).render('500', {
			error: err.stack
		});
	});

	// Assume 404 since no middleware responded
	app.use(function(req, res) {
		res.status(404).render('404', {
			url: req.originalUrl,
			error: 'Not Found'
		});
	});

	if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'dev') {
		// Log SSL usage
		console.log('Securely using https protocol');

		// Create HTTPS Server
		var httpsServer = https.createServer({
            key: fs.readFileSync('./cliques-config/cert/star_cliquesads_com.key'),
            cert: fs.readFileSync('./cliques-config/cert/star_cliquesads_com.crt'),
            ca: fs.readFileSync('./cliques-config/cert/DigiCertCA.crt')
		}, app);

		// Return HTTPS server instance
		return httpsServer;
	}

	// Return Express server instance
	return app;
};