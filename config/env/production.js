/* jshint node: true */ /* jshint node: true */ 'use strict';

module.exports = {
	// db: process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://' + (process.env.DB_1_PORT_27017_TCP_ADDR || 'localhost') + '/angle',
	//db: 'mongodb://angle:alterman05@ds029950.mongolab.com:29950/angle-on-mean',
	assets: {
		lib: {
			css: [
                //'public/dist/application.min.css',
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
				'public/lib/jquery/dist/jquery.js',
				'public/lib/angular/angular.js',
				'public/lib/angular-route/angular-route.js',
				'public/lib/angular-cookies/angular-cookies.js',
				'public/lib/angular-animate/angular-animate.js',
				'public/lib/angular-touch/angular-touch.js',
				'public/lib/angular-ui-router/release/angular-ui-router.js',
				'public/lib/ngstorage/ngStorage.js',
				'public/lib/angular-ui-utils/ui-utils.js',
				'public/lib/angular-sanitize/angular-sanitize.js',
				'public/lib/angular-resource/angular-resource.js',
				'public/lib/angular-translate/angular-translate.js',
				'public/lib/angular-translate-loader-url/angular-translate-loader-url.js',
				'public/lib/angular-translate-loader-static-files/angular-translate-loader-static-files.js',
				'public/lib/angular-translate-storage-local/angular-translate-storage-local.js',
				'public/lib/angular-translate-storage-cookie/angular-translate-storage-cookie.js',
				'public/lib/oclazyload/dist/ocLazyLoad.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.js',
				'public/lib/angular-loading-bar/build/loading-bar.js',
				'public/lib/jquery.browser/dist/jquery.browser.min.js',
                'public/lib/parsleyjs/dist/parsley.min.js',
                'public/lib/chosen/chosen.jquery.min.js',
                'public/lib/angular-chosen-localytics/chosen.js',
                'public/lib/angular-bootstrap-slider/slider.js',
                'public/lib/seiyria-bootstrap-slider/dist/bootstrap-slider.min.js',
                'public/lib/angular-file-upload/angular-file-upload.min.js',
                'public/lib/bootstrap-filestyle/src/bootstrap-filestyle.js',
                'public/lib/angular-xeditable/dist/js/xeditable.min.js',
                'public/lib/angular-bootstrap-nav-tree/dist/abn_tree_directive.js',
                'public/lib/flot/jquery.flot.js',
                'public/lib/flot/jquery.flot.*.js',
                'public/lib/flot.tooltip/js/jquery.flot.tooltip.min.js',
                'public/lib/lodash/lodash.min.js',
                'public/lib/moment/min/moment.min.js',
                'public/lib/moment-timezone/builds/moment-timezone-with-data.min.js',
                'public/lib/ngDialog/js/ngDialog.min.js',
                'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput.min.js',
                'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput-angular.min.js'
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
	},
	mailer: {
		from: process.env.MAILER_FROM || 'MAILER_FROM',
		options: {
			service: process.env.MAILER_SERVICE_PROVIDER || 'MAILER_SERVICE_PROVIDER',
			auth: {
				user: process.env.MAILER_EMAIL_ID || 'MAILER_EMAIL_ID',
				pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD'
			}
		}
	}
};
