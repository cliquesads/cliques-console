/**=========================================================
 * Module: morris.js
 * AngularJS Directives for Morris Charts
 =========================================================*/

(function() {
    "use strict";

    angular.module('core').directive('morrisBar',   morrisChart('Bar')   );
    angular.module('core').directive('morrisDonut', morrisChart('Donut') );
    angular.module('core').directive('morrisLine',  morrisChart('Line')  );
    angular.module('core').directive('morrisArea',  morrisChart('Area')  );

    function morrisChart(type) {
      return function () {
        return {
          restrict: 'EA',
          scope: {
            morrisData: '=',
            morrisOptions: '='
          },
          link: function($scope, elem, attrs) {
            // start ready to watch for changes in data
            $scope.$watch("morrisData", function(newVal, oldVal) {
              if (newVal) {
                $scope.morrisInstance.setData(newVal);
                $scope.morrisInstance.redraw();
              }
            }, true);
            // the element that contains the chart
            $scope.morrisOptions.element = elem;
            // If data defined copy to options
            if($scope.morrisData)
              $scope.morrisOptions.data = $scope.morrisData;
            // Init chart
            $scope.morrisInstance = new Morris[type]($scope.morrisOptions);

          }
        }
      }
    }

})();
