/**
 * One-time migration script to add organization to advertisers & publishers.
 * Takes first user's org and adds it.
 */

var init = require('../config/init')(),
    config = require('../config/config'),
    util = require('util'),
    mongoose = require('mongoose'),
    cliques_mongo = require('@cliques/cliques-node-utils').mongodb,
    chalk = require('chalk');

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

mongoose.connect(exchangeMongoURI, exchangeMongoOptions, function(err, logstring) {
    if (err) {
        console.error(chalk.red('Could not connect default connection to MongoDB!'));
        console.log(chalk.red(err));
    }
    console.log('Connected to exchange connection as default mongo DB connection');

    var publisherModels = new cliques_mongo.models.PublisherModels(db);
    var advertiserModels = new cliques_mongo.models.AdvertiserModels(db);

    advertiserModels.Advertiser.find({}).populate('user').exec(function(err, advertisers){
        advertisers.forEach(function(adv){
            if (adv.user[0]){
                adv.organization = adv.user[0].toObject().organization;
                adv.save(function(err, saved){
                    if (err) console.error(err);
                    console.log('Org ' + saved.organization + ' added to ' + saved.name);
                });
            } else {
                console.log('ERROR: Org ' + adv.name + ' has no users.');
            }
        });
    });

    publisherModels.Publisher.find({}).populate('user').exec(function(err, publishers){
        publishers.forEach(function(pub){
            if (pub.user[0]){
                pub.organization = pub.user[0].toObject().organization;
                pub.save(function(err, saved){
                    if (err) console.error(err);
                    console.log('Org ' + saved.organization + ' added to ' + saved.name);
                });
            } else {
                console.log('ERROR: Org ' + pub.name + ' has no users.');
            }
        });
    });
});
