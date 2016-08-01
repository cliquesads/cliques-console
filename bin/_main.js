/**
 * Wrapper for all scripts that need DB & server config variables.
 *
 * USAGE
 * In your script, do:
 *
 * ```
 * require('./_main)(function(GLOBALS){
 *
 *     // Now you can do stuff involving database connection in here
 *
 * });
 *
 * ```
 *
 * `GLOBALS` just wraps up all important closure variables into an object for you to use
 * in your sub-function, where:
 *
 * GLOBALS.config = require('../config/config');
 * GLOBALS.cliques_mongo = require('@cliques/cliques-node-utils').mongodb;
 * GLOBALS.cliques_config = require('config');
 * GLOBALS.mongoose = require('mongoose');
 * GLOBALS.db is an open mongoose DB connection
 * GLOBALS.autoIncrement = require('mongoose-auto-increment').initialize(db);
 */


var init = require('../config/init')(),
    config = require('../config/config'),
    cliques_config = require('config'),
    cliques_mongo = require('@cliques/cliques-node-utils').mongodb,
    mongoose = require('mongoose'),
    util = require('util'),
    autoIncrement = require('mongoose-auto-increment');

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

autoIncrement.initialize(db);

module.exports = function(func){
    mongoose.connect(exchangeMongoURI, exchangeMongoOptions, function(err, logstring) {
        if (err) {
            console.error(chalk.red('Could not connect default connection to MongoDB!'));
            console.log(chalk.red(err));
        }
        console.log('Connected to exchange connection as default mongo DB connection');

        // construct GLOBALS object containing some handy variables from closure to pass to
        // runtime function
        var GLOBALS = {
            config: config,
            cliques_mongo: cliques_mongo,
            cliques_config: cliques_config,
            mongoose: mongoose,
            autoIncrement: autoIncrement,
            db: db
        };
        return func(GLOBALS);
    });
};