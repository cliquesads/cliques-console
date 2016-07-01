'use strict';

// Init the application configuration module for AngularJS application
var ApplicationConfiguration = (function() {
	// Init module configuration options
	var applicationModuleName = 'cliquesConsole';
	var applicationModuleVendorDependencies = [
        'ngRoute',
        'ngAnimate',
        'ngStorage',
        'ngTouch',
        'ngCookies',
        'pascalprecht.translate',
        'ui.bootstrap',
        'ui.router',
        'ui.bootstrap-slider',
        'oc.lazyLoad',
        'cfp.loadingBar',
        'ngSanitize',
        'ngResource',
        'localytics.directives',
        'ui.utils',
        'angularBootstrapNavTree',
        'angularFileUpload',
        'xeditable',
        'ngDialog',
        'bootstrap-tagsinput',
        'ivh.treeview',
        'angulartics',
        'angulartics.mixpanel',
        'datatables',
        'akoenig.deckgrid',
        'ntt.TreeDnD',
        'datatables.buttons',
        'datatables.bootstrap',
        'rzModule',
        'ngCountryStateSelect',
        'trTrustpass',
        'hm.readmore',
        'ngclipboard',
        'ui.identicon',
        'angularPayments',
        'puigcerber.countryPicker',
        'angular.filter'
    ];
	// Add a new vertical module
	var registerModule = function(moduleName, dependencies) {
		// Create angular module
		angular.module(moduleName, dependencies || []);

		// Add the module to the AngularJS configuration file
		angular.module(applicationModuleName).requires.push(moduleName);
	};

	return {
		applicationModuleName: applicationModuleName,
		applicationModuleVendorDependencies: applicationModuleVendorDependencies,
		registerModule: registerModule
	};
})();