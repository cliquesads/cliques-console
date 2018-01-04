/* jshint node: true */
'use strict';

var cliquesConfig = require('config');
var NATIVE_SPECS = require('@cliques/cliques-node-utils').mongodb.models.NATIVE_SPECS;
var vendorCss = require('./vendorFiles/vendorCss');
var vendorJs = require('./vendorFiles/vendorJs');
var _ = require('lodash');
var vendorSass = require('./vendorFiles/vendorSass');
var vendorImages = require('./vendorFiles/vendorImages');

var nativeSpecs = _.extend(cliquesConfig.get('Native'), NATIVE_SPECS);



module.exports = {
	app: {
		title: cliquesConfig.get('Console.app.title'),
		description: cliquesConfig.get('Console.app.description'),
		keywords: cliquesConfig.get('Console.app.keywords')
	},
    deploymentMode: cliquesConfig.get('Console.deploymentMode'),
    rootCliqueId: cliquesConfig.get('Console.rootCliqueId'),
    logoBucket: cliquesConfig.get('Console.brand.logoBucket'),
	port: process.env.PORT || 5000,
	templateEngine: 'swig',
    templatePath: 'app/views/templates',
	sessionSecret: 'MEAN',
	sessionCollection: 'sessions',
	assets: {
		lib: {
            // default to the loading the whole damn list of vendor files one by one
            // obviously don't do this in prod, it's only for debugging
            css: vendorCss,
            js: vendorJs
		},
		css: [
            'public/dist/application.min.css'
		],
		js: [
			'public/config.js',
			'public/application.js',
			'public/modules/*/*.js',
			'public/modules/*/*[!tests]*/*.js'
		],
		tests: [
			'public/lib/angular-mocks/angular-mocks.js',
			'public/modules/*/tests/*.js'
		]
	},
    vendor: {
        js: vendorJs,
        sass: vendorSass,
        css: vendorCss,
        image: vendorImages
    },
    mongodb: {
        user: cliquesConfig.get('Console.mongodb.exchange.user'),
        pwd: cliquesConfig.get('Console.mongodb.exchange.pwd'),
        host: cliquesConfig.get('Console.mongodb.exchange.host'),
        port: cliquesConfig.get('Console.mongodb.exchange.port'),
        db: cliquesConfig.get('Console.mongodb.exchange.db')
    },
    mailer: {
        options: {
            service: cliquesConfig.get('Email.Support.service'),
            auth: {
                user: cliquesConfig.get('Email.Support.username'),
                pass: cliquesConfig.get('Email.Support.password')
            }
        }
    },

    // Native Ad Specs (i.e. string length minimums, etc.) shared by utils
    nativeSpecs: nativeSpecs,

    // Helpscout beacon & support URL configs
    helpScout: {
        baseUrl: cliquesConfig.get('HelpScout.baseUrl'),
        beaconFormId: cliquesConfig.get('HelpScout.beaconFormId')
    },

    // Strategies are unused for now
    facebook: {
        clientID: process.env.FACEBOOK_ID || 'APP_ID',
        clientSecret: process.env.FACEBOOK_SECRET || 'APP_SECRET',
        callbackURL: '/auth/facebook/callback'
    },
    twitter: {
        clientID: process.env.TWITTER_KEY || 'CONSUMER_KEY',
        clientSecret: process.env.TWITTER_SECRET || 'CONSUMER_SECRET',
        callbackURL: '/auth/twitter/callback'
    },
    google: {
        clientID: process.env.GOOGLE_ID || 'APP_ID',
        clientSecret: process.env.GOOGLE_SECRET || 'APP_SECRET',
        callbackURL: '/auth/google/callback'
    },
    linkedin: {
        clientID: process.env.LINKEDIN_ID || 'APP_ID',
        clientSecret: process.env.LINKEDIN_SECRET || 'APP_SECRET',
        callbackURL: '/auth/linkedin/callback'
    },
    github: {
        clientID: process.env.GITHUB_ID || 'APP_ID',
        clientSecret: process.env.GITHUB_SECRET || 'APP_SECRET',
        callbackURL: '/auth/github/callback'
    }
};