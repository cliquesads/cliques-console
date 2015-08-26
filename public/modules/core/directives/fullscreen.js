/**=========================================================
 * Module: fullscreen.js
 * Toggle the fullscreen mode on/off
 =========================================================*/

/* global _, angular, screenfull */
'use strict';

angular.module('core').directive('toggleFullscreen', ['browser', function(browser) {

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      // Not supported under IE
      if( browser.msie ) {
        element.addClass("hide");
      }
      else {
        element.on('click', function (e) {
            e.preventDefault();

            if (screenfull.enabled) {
              
              screenfull.toggle();
              
              // Switch icon indicator
              if(screenfull.isFullscreen)
                $(this).children('em').removeClass('fa-expand').addClass('fa-compress');
              else
                $(this).children('em').removeClass('fa-compress').addClass('fa-expand');

            } else {
              $.error('Fullscreen not enabled');
            }

        });
      }
    }
  };

}]);

