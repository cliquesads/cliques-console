/**=========================================================
 * Module: animate-enabled.js
 * Enable or disables ngAnimate for element with directive
 =========================================================*/
/* global _, angular */
'use strict';

angular.module('core').directive("animateEnabled", ["$animate", function ($animate) {
  return {
    link: function (scope, element, attrs) {
      scope.$watch(function () {
        return scope.$eval(attrs.animateEnabled, scope);
      }, function (newValue) {
        $animate.enabled(!!newValue, element);
      });
    }
  };
}]);