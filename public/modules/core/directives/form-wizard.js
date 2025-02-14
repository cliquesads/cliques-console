/**=========================================================
 * Module: form-wizard.js
 * Handles form wizard plugin and validation
 =========================================================*/

/* global _, angular */
'use strict';

angular.module('core').directive('formWizard', ["$parse", "$q", function($parse){

  return {
    restrict: 'A',
    scope: true,
    link: function(scope, element, attribute) {
      var validate = $parse(attribute.validateSteps)(scope),
          wiz = new Wizard(attribute.steps, !!validate, element);
      scope.wizard = wiz.init();

    }
  };

  function Wizard (quantity, validate, element) {
    
    var self = this;
    self.quantity = parseInt(quantity,10);
    self.validate = validate;
    self.element = element;

    self.init = function() {
      self.createsteps(self.quantity);
      self.go(1); // always start at fist step
      return self;
    };

    // Just runs validation for current step, doesn't go to next
    self.validateStep = function(step) {

      if ( angular.isDefined(self.steps[step]) ) {
        if(self.validate && step !== 1) {
          var form = $(self.element),
              group = form.children().children('div').get(step - 1);

          if (false === form.parsley().validate( group.id )) {
            return false;
          }
        }
        return true;
      }
    };

    self.go = function(step) {
      
      if ( angular.isDefined(self.steps[step]) ) {

        if(self.validate && step !== 1) {
          var form = $(self.element),
              group = form.children().children('div').get(step - 2);

          if (false === form.parsley().validate( group.id )) {
            return false;
          }
        }
        self.cleanall();
        self.steps[step] = true;
      }
    };

    self.goNoValidate = function(step) {
      if ( angular.isDefined(self.steps[step]) ) {
          self.cleanall();
          self.steps[step] = true;
          return true;
      }
    };

    self.active = function(step) {
      return !!self.steps[step];
    };

    self.cleanall = function() {
      for(var i in self.steps){
        self.steps[i] = false;
      }
    };

    self.createsteps = function(q) {
      self.steps = [];
      for(var i = 1; i <= q; i++) self.steps[i] = false;
    };

  }

}]);
