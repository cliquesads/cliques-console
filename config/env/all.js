/* jshint node: true */
'use strict';

var cliquesConfig = require('config');

module.exports = {
	app: {
		title: 'Cliques Console',
		description: 'Bootstrap Admin Theme + Meanjs',
		keywords: 'MongoDB, Express, AngularJS, Node.js'
	},
	port: process.env.PORT || 5000,
	templateEngine: 'swig',
	sessionSecret: 'MEAN',
	sessionCollection: 'sessions',
	assets: {
		lib: {
            css: [],
            js: [
                'public/dist/vendor.min.js'
            ]
		},
		css: [
            'public/lib/chosen/chosen.min.css',
			'public/dist/application.min.css',
            'public/lib/angular-bootstrap-nav-tree/dist/abn_tree.css',
            'public/lib/seiyria-bootstrap-slider/dist/css/bootstrap-slider.min.css',
            'public/lib/loaders.css/loaders.min.css',
            'public/lib/angular-xeditable/dist/css/xeditable.css',
            'public/lib/ngDialog/css/ngDialog.min.css',
            'public/lib/ngDialog/css/ngDialog-theme-default.min.css',
            'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput.css',
            'public/lib/angular-ivh-treeview/dist/ivh-treeview.min.css',
            'public/lib/angular-ivh-treeview/dist/ivh-treeview-theme-basic.css'
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
            'public/lib/lodash/lodash.min.js',
            'public/lib/moment/min/moment.min.js',
            'public/lib/moment-timezone/builds/moment-timezone-with-data.min.js',
            'public/lib/ngDialog/js/ngDialog.min.js',
            'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput.min.js',
            'public/lib/bootstrap-tagsinput/dist/bootstrap-tagsinput-angular.min.js',
            'public/lib/angular-ivh-treeview/dist/ivh-treeview.min.js',
            'public/lib/angulartics/dist/angulartics.min.js',
            'public/lib/angulartics-mixpanel/dist/angulartics-mixpanel.min.js'
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
        from: cliquesConfig.get('Email.Support.username'),
        options: {
            service: cliquesConfig.get('Email.Support.service'),
            auth: {
                user: cliquesConfig.get('Email.Support.username'),
                pass: cliquesConfig.get('Email.Support.password')
            }
        }
    }
};