/**=========================================================
 * Module: notify.js
 * Directive for notify plugin
 =========================================================*/

/* global _, angular */
'use strict';

angular.module('core').directive('notify', ["$window", "Notify", function($window, Notify){

  return {
    restrict: 'A',
    scope: {
        options: '=',
        message: '='
    },
    link: function (scope, element, attrs) {
      
      element.on('click', function (e) {
        e.preventDefault();
        Notify.alert(scope.message, scope.options);
      });

    }
  };

}]);

