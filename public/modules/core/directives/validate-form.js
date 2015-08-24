/**=========================================================
 * Module: validate-form.js
 * Initializes the validation plugin Parsley
 =========================================================*/

/* global _, angular */
'use strict';

angular.module('core').directive('validateForm', function() {
  return {
    restrict: 'A',
    controller: ["$scope", "$element", function($scope, $element) {
      var $elem = $($element);
      if($.fn.parsley)
        $elem.parsley();
    }]
  };
});
