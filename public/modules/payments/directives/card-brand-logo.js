angular.module('payments').directive('cardBrandLogo', [function(){
    'use strict';
    return {
        restrict: 'E',
        scope: {
            brand: '=',
            sizeCls: '@'
        },
        template: '<i class="fa {{ sizeCls }} {{ cls }}"></i>',
        link: function(scope, element, attrs){
            var map = {
                "Visa": "fa-cc-visa",
                "American Express": "fa-cc-amex",
                "MasterCard": "fa-cc-mastercard",
                "Discover": "fa-cc-discover",
                "JCB": "fa-cc-jcb",
                "Diners Club": "fa-cc-diners-club",
                "Unknown": "fa-credit-card-alt"
            };
            scope.$watch("brand", function(newBrand, oldBrand){
                scope.cls = map[newBrand];
            });
        }
    };
}]);