/**
 * One-time migration script (5/24/16) to migrate from old user/org schema
 * (user holding org type, org having no type) to new schema (user has role within org,
 * org has 'advertiser','publisher' or 'networkAdmin' type).
 *
 * ONLY TO BE RUN ON USERS/ORG DATABASE WITH OLD STRUCTURE.  THIS IS NOT REVERSIBLE.
 */

var init = require('../config/init')(),
    config = require('../config/config'),
    util = require('util'),
    mongoose = require('mongoose'),
    async = require('async'),
    chalk = require('chalk');
    // users = require('../app/models/user.server.model.js');

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

mongoose.connect(exchangeMongoURI, exchangeMongoOptions, function(err, logstring) {
    if (err) {
        console.error(chalk.red('Could not connect default connection to MongoDB!'));
        console.log(chalk.red(err));
    }
    console.log('Connected to exchange connection as default mongo DB connection');

    /**
     * First switch "primary_contact" to "owner" of org, and
     * then give organization the same type as it's owner
     * (advertiser, publisher or networkAdmin)
     */
    var migrateOrgs = function(outerCallback){
        users.Organization.find({}).populate('primary_contact').populate('users').exec(function (err, orgs) {
            // orgs.forEach(function(org) {
            async.each(orgs, function(org, callback){
                // rename primary contact property, and add
                // owner as first user if primary contact is not set
                var roles;
                if (org.primaryContact) {
                    roles = org.primaryContact.roles;
                    org.owner = org.primaryContact;
                    org.primaryContact = undefined;
                } else {
                    roles = org.users[0].roles;
                    org.owner = org.users[0];
                }
                // now set organization type
                // users.User.find({_id: org.owner}, function (err, owner) {
                // if (err) return callback(err);
                org.organization_types = [roles[0]];
                // plug for one case where this won't work, which is Cliques
                if (org._id == '5696bbdd74a4344240aede43'){
                    org.organization_types = ['networkAdmin']
                }
                org.save(function (err, obj) {
                    if (err) return console.error(err);
                    console.log(obj.name + " saved with owner: " + obj.owner +
                        " and types: " + obj.organization_types);
                    return callback();
                });
                // });
            }, function(err){
                if (err){
                    console.log(err);
                    return outerCallback(err);
                }
                outerCallback(null, true);
            });
        });
    };

    /**
     * Called once organization migration is complete
     * changes user roles from 'advertiser', 'publisher', etc. to
     * permissions-based roles instead.
     * @param outerCallback
     */
    var migrateUsers = function(outerCallback){
        users.User.find({}).populate('organization').exec(function (err, allUsers) {
            async.each(allUsers, function(user, callback){
                // make admin if owner of organization, otherwise
                // just make readWrite
                var org = user.organization;
                if (user._id.toString() === org.owner.toString()){
                    user.role = 'admin';
                } else {
                    user.role = 'readWrite';
                }
                // now delete old 'roles' property
                user.roles = undefined;
                user.save(function(err, obj){
                    if (err) return console.error(err);
                    console.log(obj.displayName + " saved with role: " + obj.role);
                    return callback();
                });
            });
        }, function(err){
            if (err){
                console.log(err);
                return outerCallback(err);
            }
            outerCallback(null, true);
        });
    };

    // Run as series
    async.series([migrateOrgs, migrateUsers], function(err, results){
        if (err) {
            console.log(err);
            process.exit(1);
        }
        console.log('Migration complete!');
        process.exit(0)
    });
});
