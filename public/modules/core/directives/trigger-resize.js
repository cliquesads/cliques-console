/**=========================================================
 * Module: trigger-resize.js
 * Triggers a window resize event from any element
 =========================================================*/

/* global _, angular, Event */
'use strict';

angular.module('core').directive("triggerResize", ['$window', '$timeout', function ($window, $timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.on('click', function(){
        $timeout(function(){
          $window.dispatchEvent(new Event('resize'));
        });
      });
    }
  };
}]);
