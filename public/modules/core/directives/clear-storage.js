/**=========================================================
 * Module: clear-storage.js
 * Removes a key from the browser storage via element click
 =========================================================*/

/* global _, angular */
'use strict';

angular.module('core').directive('resetKey',  ['$state','$rootScope', function($state, $rootScope) {

  return {
    restrict: 'A',
    scope: {
      resetKey: '='
    },
    link: function(scope, element, attrs) {
      
      scope.resetKey = attrs.resetKey;

    },
    controller: ["$scope", "$element", function($scope, $element) {
    
      $element.on('click', function (e) {
          e.preventDefault();

          if($scope.resetKey) {
            delete $rootScope.$storage[$scope.resetKey];
            $state.go($state.current, {}, {reload: true});
          }
          else {
            $.error('No storage key specified for reset.');
          }
      });

    }]

  };

}]);