/**
 * Created by bliang on 2/11/16.
 */
angular.module('core').directive('htmlInput', [function(){
    return {
        restrict: 'A',
        require: 'ngModel',
        link:
            function (scope, element, attrs, ctrl) {
                var checkHTML = function(html) {
                    var doc = document.createElement('div');
                    doc.innerHTML = html;
                    return ( doc.innerHTML === html );
                };
                ctrl.$validators.html = function(modelValue, viewValue){
                    if (ctrl.$isEmpty(viewValue)){
                        return true;
                    }
                    return checkHTML(viewValue);
                };
            }
    };
}
]);
