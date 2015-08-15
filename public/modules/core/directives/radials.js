/**
 * Created by bliang on 8/6/15.
 */

angular.module('core').directive("radial", function(){
    return {
        restrict: 'E',
        scope: {
            percent: '@',
            size: '@'
        },
        template: '<div data-label="{{ percent_formatted }}" class="radial-bar {{ radial_percent_class }} radial-bar-{{ size }}"></div>',
        link: function(scope, element, attrs){
            var percentage = Number(scope.percent).toFixed(0);
            scope.radial_percent_class = 'radial-bar-' + percentage;
            scope.percent_formatted = percentage + '%';
        }
    };
});