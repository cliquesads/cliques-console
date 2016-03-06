/**=========================================================
 * Module: main.js
 * Main Application Controller
 =========================================================*/

angular.module('core').controller('AppController',
  ['$rootScope', '$scope', '$state', '$translate', '$location','$window', '$localStorage', '$timeout', '$analytics','colors', 'browser', 'cfpLoadingBar', 'Authentication',
  function($rootScope, $scope, $state, $translate, $location, $window, $localStorage, $timeout, $analytics, colors, browser, cfpLoadingBar, Authentication) {
    "use strict";

    // This provides Authentication context.
    $scope.authentication = Authentication;

    // Server-side variables passed to server-rendered index template
    $scope.consoleVersion = consoleVersion;
    $scope.latestHour = moment(latestHour).tz(user.tz).format('MMM Do YYYY h:mm A z');

    if (user){
        // TODO: FIX THIS
        if (user.roles.indexOf('admin') > -1){
            $scope.role = 'admin';
        } else if (user.roles.indexOf('advertiser') > -1){
            $scope.role = 'advertiser';
        } else if (user.roles.indexOf('publisher') > -1){
            $scope.role = 'publisher';
        }
        // Now set MixPanel user properties
        $analytics.setUsername(user.username);
        $analytics.setAlias(user.displayName);
        $analytics.setUserProperties({
            $first_name: user.firstName,
            $last_name: user.lastName,
            $name: user.displayName,
            $created: user.created,
            $email: user.email,
            roles: user.roles
        });
        // Set latestHour of reporting data for footer
        $scope.latestHour = moment(latestHour).tz(user.tz).format('MMM Do YYYY h:mm A z');
    }

    // Loading bar transition
    // -----------------------------------
    var thBar;
    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        // evalulate requireLogin data param here for toState
        if (toState.data.requireLogin && !$scope.authentication.user){
            $location.path('/signin');
        }
        // TODO: This is all a horrible hack to temporarily put in place an access code scheme
        // Redirect users to signin page if not logged in
        if (!$scope.authentication.accesscode && $location.path() === '/signup'){
            $location.path('/beta-access');
        }

        if($('.wrapper > section').length) // check if bar container exists
          thBar = $timeout(function() {
            cfpLoadingBar.start();
          }, 0); // sets a latency Threshold
    });
    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        event.targetScope.$watch("$viewContentLoaded", function () {
          $timeout.cancel(thBar);
          cfpLoadingBar.complete();
        });
    });


    // Hook not found
    $rootScope.$on('$stateNotFound',
      function(event, unfoundState, fromState, fromParams) {
          console.log(unfoundState.to); // "lazy.state"
          console.log(unfoundState.toParams); // {a:1, b:2}
          console.log(unfoundState.options); // {inherit:false} + default options
      });
    // Hook error
    $rootScope.$on('$stateChangeError',
      function(event, toState, toParams, fromState, fromParams, error){
        console.log(error);
      });
    // Hook success
    $rootScope.$on('$stateChangeSuccess',
      function(event, toState, toParams, fromState, fromParams) {
        // display new view from top
        $window.scrollTo(0, 0);
        // Save the route title
        $rootScope.currTitle = $state.current.title;
      });

    $rootScope.currTitle = $state.current.title;
    $rootScope.pageTitle = function() {
      return $rootScope.app.name + ' - ' + ($rootScope.currTitle || $rootScope.app.description);
    };

    // iPad may presents ghost click issues
    // if( ! browser.ipad )
      // FastClick.attach(document.body);

    // Close submenu when sidebar change from collapsed to normal
    $rootScope.$watch('app.layout.isCollapsed', function(newValue, oldValue) {
      if( newValue === false )
        $rootScope.$broadcast('closeSidebarMenu');
    });

    // Restore layout settings
    if( angular.isDefined($localStorage.layout) )
      $scope.app.layout = $localStorage.layout;
    else
      $localStorage.layout = $scope.app.layout;

    $rootScope.$watch("app.layout", function () {
      $localStorage.layout = $scope.app.layout;
    }, true);


    // Allows to use branding color with interpolation
    // {{ colorByName('primary') }}
    $scope.colorByName = colors.byName;

    // Internationalization
    // ----------------------

    $scope.language = {
      // Handles language dropdown
      listIsOpen: false,
      // list of available languages
      available: {
        'en':       'English',
        'es_AR':    'Español'
      },
      // display always the current ui language
      init: function () {
        var proposedLanguage = $translate.proposedLanguage() || $translate.use();
        var preferredLanguage = $translate.preferredLanguage(); // we know we have set a preferred one in app.config
        $scope.language.selected = $scope.language.available[ (proposedLanguage || preferredLanguage) ];
      },
      set: function (localeId, ev) {
        // Set the new idiom
        $translate.use(localeId);
        // save a reference for the current language
        $scope.language.selected = $scope.language.available[localeId];
        // finally toggle dropdown
        $scope.language.listIsOpen = ! $scope.language.listIsOpen;
      }
    };

    $scope.language.init();

    // Applies animation to main view for the next pages to load
    $timeout(function(){
      $rootScope.mainViewAnimation = $rootScope.app.viewAnimation;
    });

    // cancel click event easily
    $rootScope.cancel = function($event) {
      $event.stopPropagation();
    };

}]);
