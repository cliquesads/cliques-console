/**
 * Configure various Express Router instances that are passed to routing files
 * for use.  Separate routers for API, console API & unauthenticated endpoints
 * allows for consolidation of authentication middleware methods.
 */

var express = require('express');
var methods = require('methods');
var passport = require('passport');
var users = require('../app/controllers/users.server.controller');

// basicAuthRouter does not use sessions, requires basicAuth for each request.
// Designed for use w/ developer API
var basicAuthRouter = exports.basicAuthRouter = express.Router();
basicAuthRouter.use(passport.authenticate('basic', { session: false }));

// localAuthRouter uses persistent user sessions, requires explicit login by posting to
// authentication endpoints.  Used for console endpoints requiring authentication.
var localAuthRouter = exports.localAuthRouter = express.Router();
localAuthRouter.use(users.requiresLogin);

// Router for unprotected endpoints.
var noAuthRouter = exports.noAuthRouter = express.Router();

/**
 * Not actually a router, but a wrapper for both basicAuth AND
 * localAuth routers so route files can easily apply methods
 * to both routers without extra typing.
 *
 * Ex:
 *    bothAuthRouters.route('/advertiser');
 *
 * is equivalent to:
 *    basicAuthRouter.route('/advertiser');
 *    localAuthRouter.route('/advertiser');
 */
var bothAuthRouters = exports.bothAuthRouters = {};
// List of all router methods. 'methods' lib is same as used by Express itself
var routerMethods = ['all','param','use','route'].concat(methods);
routerMethods.forEach(function(method){
    bothAuthRouters[method] = function(args){
        basicAuthRouter.apply(this, arguments);
        localAuthRouter.apply(this, arguments);
    }
});