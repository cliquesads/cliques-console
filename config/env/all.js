/* jshint node: true */
'use strict';

var cliquesConfig = require('config');

module.exports = {
	app: {
		title: 'Cliques Console',
		description: 'Meanjs App for Cliques Labs Inc.',
		keywords: 'MongoDB, Express, AngularJS, Node.js'
	},
	port: process.env.PORT || 5000,
	templateEngine: 'swig',
    templatePath: 'app/views/templates',
	sessionSecret: 'MEAN',
	sessionCollection: 'sessions',
	assets: {
		lib: {
            css: [
                'public/dist/vendor.min.css'
            ],
            js: [
                'public/dist/vendor.min.js'
            ]
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
        js: [
            'public/lib/jquery/dist/jquery.js',
            'public/lib/angular/angular.js',
            'public/lib/angular-bootstrap-nav-tree/dist/abn_tree_directive.js',
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
            'public/lib/jquery.browser/dist/jquery.browser.js',
            'public/lib/parsleyjs/dist/parsley.min.js',
            'public/lib/chosen/chosen.jquery.min.js',
            'public/lib/angular-chosen-localytics/chosen.js',
            'public/lib/angular-bootstrap-slider/slider.js',
            'public/lib/seiyria-bootstrap-slider/dist/bootstrap-slider.min.js',
            'public/lib/angular-file-upload/angular-file-upload.min.js',
            'public/lib/bootstrap-filestyle/src/bootstrap-filestyle.js',
            'public/lib/angular-xeditable/dist/js/xeditable.min.js',
            'public/lib/flot/jquery.flot.js',
            'public/lib/flot/jquery.flot.*.js',
            'public/lib/flot.tooltip/js/jquery.flot.tooltip.min.js',
            'public/lib/lodash/dist/lodash.min.js',
            'public/lib/moment/min/moment.min.js',
            'public/lib/moment-timezone/builds/moment-timezone-with-data.min.js',
            'public/lib/ngDialog/js/ngDialog.min.js',
            'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput.min.js',
            'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput-angular.min.js',
            'public/lib/angular-ivh-treeview/dist/ivh-treeview.min.js',
            'public/lib/angulartics/dist/angulartics.min.js',
            'public/lib/angulartics-mixpanel/dist/angulartics-mixpanel.min.js',
            'public/lib/datatables/media/js/jquery.dataTables.min.js',
            'public/lib/datatables/media/js/dataTables.bootstrap.min.js',
            'public/lib/datatables-buttons/js/dataTables.buttons.js',
            'public/lib/datatables-buttons/js/buttons.bootstrap.js',
            'public/lib/datatables-buttons/js/buttons.colVis.js',
            'public/lib/datatables-buttons/js/buttons.flash.js',
            'public/lib/datatables-buttons/js/buttons.foundation.js',
            'public/lib/datatables-buttons/js/buttons.html5.js',
            'public/lib/datatables-buttons/js/buttons.jqueryui.js',
            'public/lib/datatables-buttons/js/buttons.print.js',
            'public/lib/angular-datatables/dist/angular-datatables.min.js',
            'public/lib/angular-deckgrid/angular-deckgrid.js',
            'public/lib/angular-tree-dnd/dist/ng-tree-dnd.js',
            'public/lib/angular-datatables/dist/plugins/bootstrap/angular-datatables.bootstrap.js',
            'public/lib/angular-datatables/dist/plugins/buttons/angular-datatables.buttons.js',
            'public/lib/angularjs-slider/dist/rzslider.min.js',
            'public/lib/angular-country-state-select/dist/angular-country-state-select.js',
            'public/lib/angular-trustpass/dist/tr-trustpass.min.js',
            'public/lib/intl-tel-input/lib/libphonenumber/build/utils.js',
            'public/lib/intl-tel-input/build/js/intlTelInput.min.js'
        ],
        sass: [
            'public/lib/datatables-buttons/css/buttons.dataTables.scss',
            'public/lib/datatables-buttons/css/buttons.bootstrap.scss'
        ],
        css: [
            'public/lib/chosen/chosen.min.css',
            'public/lib/bootstrap/dist/css/bootstrap.min.css',
            'public/lib/angular-bootstrap-nav-tree/dist/abn_tree.css',
            'public/lib/seiyria-bootstrap-slider/dist/css/bootstrap-slider.min.css',
            'public/lib/loaders.css/loaders.min.css',
            'public/lib/angular-xeditable/dist/css/xeditable.css',
            'public/lib/ngDialog/css/ngDialog.min.css',
            'public/lib/ngDialog/css/ngDialog-theme-default.min.css',
            'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput.css',
            'public/lib/angular-ivh-treeview/dist/ivh-treeview.min.css',
            'public/lib/angular-ivh-treeview/dist/ivh-treeview-theme-basic.css',
            'public/lib/datatables/media/css/jquery.dataTables.min.css',
            'public/lib/angular-tree-dnd/dist/ng-tree-dnd.min.css',
            'public/lib/angularjs-slider/dist/rzslider.min.css',
            'public/lib/cliques-icons/styles.css',
            'public/lib/angular-trustpass/dist/tr-trustpass.min.css',
            'public/lib/intl-tel-input/build/css/intlTelInput.css',

            // Following files are all built from SASS sources
            'public/dist/common.css',
            'public/dist/mixins.css',
            'public/dist/buttons.foundation.css',
            'public/dist/buttons.dataTables.css',
            'public/dist/buttons.bootstrap.css',
            'public/dist/buttons.jqueryui.css'
        ]
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