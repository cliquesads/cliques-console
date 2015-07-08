'use strict';
/**
 * Module dependencies.
 */
var init = require('./config/init')(),
	config = require('./config/config'),
    pmx = require('pmx').init(),
    util = require('util'),
    cliques_mongo = require('cliques_node_utils').mongodb,
    mongoose = require('mongoose'),
	chalk = require('chalk');

/**
 * Main application entry file.
 * Please note that the order of loading is important.
 */
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
var db = cliques_mongo.createConnectionWrapper(exchangeMongoURI, exchangeMongoOptions, function(err, logstring){
    if (err) {
        console.error(chalk.red('Could not connect to MongoDB!'));
        console.log(chalk.red(err));
    }
    console.log(logstring);
});

// Create default connection as well for built-in UI-only models
// TODO: Fix this to use connection object so you don't have to rely on default connection
mongoose.connect(exchangeMongoURI, exchangeMongoOptions, function(err, logstring){
    if (err) {
        console.error(chalk.red('Could not connect default connection to MongoDB!'));
        console.log(chalk.red(err));
    }
    console.log('Connected to exchange connection as default mongo DB connection');
});

// Init the express application
var app = require('./config/express')(db);

// Bootstrap passport config
require('./config/passport')();

// Start the app by listening on <port>
app.listen(config.port);

// Expose app
exports = module.exports = app;

// Logging initialization
console.log('MEAN.JS application started on port ' + config.port);