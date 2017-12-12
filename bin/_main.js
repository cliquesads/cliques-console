'use strict';

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
 * GLOBALS.args = parser.parseArgs(); // command line arguments hash
 *
 * @param func
 * @param [cliArgs] optional array of CLI arg...args to pass to parser.addArgument constructor, ex:
 *                  [ [['-d', '--derp'], { help: 'derp derp'}], [['-b', '--bar'], { help: 'bar bar'}] ]
 */
module.exports = function(func, cliArgs){
    var chalk = require('chalk');
    // First handle command line args via argparse
    cliArgs = cliArgs || false;
    var ArgumentParser = require('argparse').ArgumentParser;

    // handle environment args
    var parser = new ArgumentParser({
        version: '0.0.1',
        addHelp:true,
        description: 'Run a script'
    });
    // 'env' or '-e' is the only default argument automatically parsed by main script
    parser.addArgument(
        ['-e', '--env'],
        {
            help: 'Config environment to set NODE_ENV to, e.g. \'dev\', \'production\', \'local-test\''
        }
    );

    // add arguments passed in by caller
    if (cliArgs){
        cliArgs.forEach(function(argArgs){
            parser.addArgument(argArgs[0], argArgs[1]);
        });
    }

    var args = parser.parseArgs();
    if (args['env']){
        // set NODE_ENV with arg -e or --env
        // don't need to handle fallback if env is invalid, this is done in config/init.js
        process.env.NODE_ENV = args['env'];
    }

    // Now go through the requires
    var init = require('../config/init')(),
        config = require('../config/config'),
        cliques_config = require('config'),
        cliques_mongo = require('@cliques/cliques-node-utils').mongodb,
        mongoose = require('mongoose'),
        util = require('util'),
        autoIncrement = require('mongoose-auto-increment');

    // Now set up the DB connections
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

    // Now create mongoose connection object
    var db = cliques_mongo.createConnectionWrapper(exchangeMongoURI, exchangeMongoOptions, function(err, logstring){
        if (err) {
            console.error(chalk.red('Could not connect to MongoDB!'));
            console.log(chalk.red(err));
        }
        console.log(logstring);
    });

    // initialize autoIncrement module for models that use autoIncrementing Numbers for _id's instead of ObjectIds
    autoIncrement.initialize(db);

    // wrap in mongoose.connect, which is pretty redundant considering you've already created the 'db' connection
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
            db: db,
            args: args
        };
        return func(GLOBALS);
    });
};