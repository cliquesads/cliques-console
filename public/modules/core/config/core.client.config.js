'use strict';

// Configuring the Core module
angular.module('core').run(['Menus',
  function(Menus) {

    // Add default menu entry
    Menus.addMenuItem('sidebar', 'Home', 'home', null, 'home', false,  ['networkAdmin','advertiser','publisher'], null, 'fa fa-home');

  }
]).config(['$ocLazyLoadProvider', 'APP_REQUIRES', function ($ocLazyLoadProvider, APP_REQUIRES) {
  // Lazy Load modules configuration
  $ocLazyLoadProvider.config({
    debug: false,
    events: true,
    modules: APP_REQUIRES.modules
  });

}]).config(['$controllerProvider', '$compileProvider', '$filterProvider', '$provide',
  function ( $controllerProvider, $compileProvider, $filterProvider, $provide) {
  // registering components after bootstrap
  angular.module('core').controller = $controllerProvider.register;
  angular.module('core').directive  = $compileProvider.directive;
  angular.module('core').filter     = $filterProvider.register;
  angular.module('core').factory    = $provide.factory;
  angular.module('core').service    = $provide.service;
  angular.module('core').constant   = $provide.constant;
  angular.module('core').value      = $provide.value;

}]).config(['$translateProvider', function ($translateProvider) {

  $translateProvider.useStaticFilesLoader({
    prefix : 'modules/core/i18n/',
    suffix : '.json'
  });
  $translateProvider.preferredLanguage('en');
  $translateProvider.useLocalStorage();

}])
.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {

  cfpLoadingBarProvider.includeBar = true;
  cfpLoadingBarProvider.includeSpinner = false;
  cfpLoadingBarProvider.latencyThreshold = 500;
  cfpLoadingBarProvider.parentSelector = '.wrapper > section';
}])
.run(['editableOptions', 'editableThemes', function(editableOptions, editableThemes){
        editableOptions.theme = 'bs3';
        editableThemes.bs3.inputClass = 'input-sm';
        editableThemes.bs3.buttonsClass = 'btn-sm';
        editableThemes.bs3.submitTpl = '<button type="button" ng-click="$form.$submit()" class="btn btn-success"><span class="fa fa-check"></span></button>';
        editableThemes.bs3.cancelTpl = '<button type="button" class="btn btn-default" ng-click="$form.$cancel()">'+
                                        '<span class="fa fa-times text-muted"></span>'+
                                        '</button>';

    }
])
.config(['ivhTreeviewOptionsProvider', function(ivhTreeviewOptionsProvider){
    ivhTreeviewOptionsProvider.set({
        twistieCollapsedTpl: '<span class="fa fa-plus-square fa-lg"></span>',
        twistieExpandedTpl: '<span class="fa fa-minus-square fa-lg"></span>',
        twistieLeafTpl: '&#9679;'
    });
}])
.config(function($sceDelegateProvider) {
        $sceDelegateProvider.resourceUrlWhitelist([
            // Allow same origin resource loads.
            'self',
            // Allow loading from our assets domain.  Notice the difference between * and **.
            'https://adsrvs.cliquesads.com/**'
        ]);
    }
)
.run(function(DTDefaultOptions){
        DTDefaultOptions.setBootstrapOptions({
            TableTools: {
                classes: {
                    container: 'btn-group',
                    buttons: {
                        normal: 'btn btn-danger'
                    }
                }
            },
            ColVis: {
                classes: {
                    masterButton: 'btn btn-primary'
                }
            }
        });
});