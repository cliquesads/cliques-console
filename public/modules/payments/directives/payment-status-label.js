angular.module('payments').directive('paymentStatusLabel', [function(){
    'use strict';
    return {
        restrict: 'E',
        scope: {
            ngModel: '=',
            admin: '@'
        },
        template: '<div class="label" ng-class="map[ngModel.status]">{{ ngModel.status }}</div>',
        link: function(scope, element, attrs){
            scope.map = {
                'Pending': 'label-warning',
                'Overdue': 'label-danger',
                'Paid': 'label-success'
            };

            if (scope.admin){
                scope.map['Needs Approval'] = 'label-warning';
                scope.map.Pending = 'label-primary';
            }
        }
    };
}]);