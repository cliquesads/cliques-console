/**=========================================================
 * Module: filestyle.js
 * Initializes the fielstyle plugin
 =========================================================*/

/* global _, angular */
'use strict';

angular.module('core').directive('filestyle', function() {
  return {
    restrict: 'A',
    controller: ["$scope", "$element", function($scope, $element) {
      var options = $element.data();
      
      // old usage support
        options.classInput = $element.data('classinput') || options.classInput;
      
      $element.filestyle(options);
    }]
  };
});
