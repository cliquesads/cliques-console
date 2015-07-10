/**=========================================================
 * Module: demo-datepicker.js
 * Provides a simple demo for bootstrap datepicker
 =========================================================*/

angular.module('core').directive('datepicker', ['$rootscope', function ($rootscope) {
  $rootscope.today = function() {
    $rootscope.dt = new Date();
  };
  $rootscope.today();

  $rootscope.clear = function () {
    $rootscope.dt = null;
  };

  // Disable weekend selection
  $rootscope.disabled = function(date, mode) {
    return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
  };

  $rootscope.toggleMin = function() {
    $rootscope.minDate = $rootscope.minDate ? null : new Date();
  };
  $rootscope.toggleMin();

  $rootscope.open = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $rootscope.opened = true;
  };

  $rootscope.dateOptions = {
    formatYear: 'yy',
    startingDay: 1
  };

  $rootscope.initDate = new Date('2016-15-20');
  $rootscope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
  $rootscope.format = $rootscope.formats[0];

}]);
