// used for datepicker forms

angular.module('core').factory('DatepickerService',function(){
    var self = this;
    self.opened = {};
    self.dateFormat = 'yyyy-MM-dd';
    self.dateOptions = {};
    self.today = new Date();
    self.open = function($event, which){
        $event.preventDefault();
        $event.stopPropagation();
        self.opened[which] = true;
    };
    return self
});

