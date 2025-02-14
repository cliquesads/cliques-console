/**=========================================================
 * Module: skycons.js
 * Include any animated weather icon from Skycons
 =========================================================*/

/* global _, angular, Skycons */
'use strict';

angular.module('core').directive('skycon', function(){

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      
      var skycons = new Skycons({'color': (attrs.color || 'white')});

      element.html('<canvas width="' + attrs.width + '" height="' + attrs.height + '"></canvas>');

      skycons.add(element.children()[0], attrs.skycon);

      skycons.play();

    }
  };
});