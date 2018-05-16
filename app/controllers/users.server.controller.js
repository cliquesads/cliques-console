/* jshint node: true */ 'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash');

/**
 * Extend user's controller
 */
module.exports = db => _.extend(
    require('./users/users.authentication.server.controller')(db),
    require('./users/users.authorization.server.controller'),
    require('./users/users.password.server.controller'),
    require('./users/users.profile.server.controller'),
    require('./users/users.termsandconditions.server.controller')
);