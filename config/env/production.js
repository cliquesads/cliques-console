/* jshint node: true */ /* jshint node: true */ 'use strict';

module.exports = {
	assets: {
		lib: {
			css: [
                'public/lib/chosen/chosen.min.css',
                'public/lib/angular-bootstrap-nav-tree/dist/abn_tree.css',
                'public/lib/seiyria-bootstrap-slider/dist/css/bootstrap-slider.min.css',
                'public/lib/loaders.css/loaders.min.css',
                'public/lib/angular-xeditable/dist/css/xeditable.css',
                'public/lib/ngDialog/css/ngDialog.min.css',
                'public/lib/ngDialog/css/ngDialog-theme-default.min.css',
                'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput.css'
			],
			js: [
				'public/dist/vendor.min.js'
			]
		},
		css: [
            'public/dist/application.min.css'
        ],
		js: 'public/dist/application.min.js'
	},
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
