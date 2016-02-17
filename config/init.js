/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var glob = require('glob'),
	chalk = require('chalk');

// TODO: This is only here b/c project uses 'config' directory, which is the default dir for
// TODO: node config module
process.env.NODE_CONFIG_DIR = './cliques-config';

/**
 * Module init function.
 */
module.exports = function() {
	/**
	 * Before we begin, lets set the environment variable
	 * We'll Look for a valid NODE_ENV variable and if one cannot be found load the development NODE_ENV
	 */
	glob('./config/env/' + process.env.NODE_ENV + '.js', {
		sync: true
	}, function(err, environmentFiles) {
		if (!environmentFiles.length) {
			if (process.env.NODE_ENV) {
				console.error(chalk.red('No configuration file found for "' + process.env.NODE_ENV + '" environment using dev instead'));
			} else {
				console.error(chalk.red('NODE_ENV is not defined! Using default dev environment'));
			}

			process.env.NODE_ENV = 'dev';
		} else {
			console.log(chalk.black.bgWhite('Application loaded using the "' + process.env.NODE_ENV + '" environment configuration'));
		}
	});
};