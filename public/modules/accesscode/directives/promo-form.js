angular.module('accesscode').directive('promoForm', ['AccessCode','Organizations', function(AccessCode) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            promo: '='
        },
        templateUrl: 'modules/accesscode/views/partials/promo-form.html',
        link: function(scope, element, attrs){
            scope.typeChoices = ['advertiser', 'publisher'];
            scope.promo = scope.promo || {
                    type: 'advertiser',
                    description: null,
                    promoAmount: null,
                    active: true,
                    promoInterval: null,
                    percentage: null,
                    minimumSpend: null
            };
        }
    };
}]);
