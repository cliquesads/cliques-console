/**=========================================================
 * Module: masked,js
 * Initializes the masked inputs
 =========================================================*/

angular.module('core').directive('masked', function() {
  return {
    restrict: 'A',
    controller: ["$scope", "$element", function($scope, $element) {
      var $elem = $($element);
      if($.fn.inputmask)
        $elem.inputmask();
    }]
  };
});
