/**
 * Created by bliang on 1/14/16.
 */
angular.module('core').directive('rowSelect', [
    function() {
        return {
            restrict: 'E',
            scope: {
                baseModel: '=',
                options: '=',
                key: '@'
            },
            templateUrl: 'modules/core/views/partials/row-select.html',
            link: function (scope, element, attrs) {

                // escape all quotes and re-enclose in quotes to pass to compiler
                var rowTemplate = attrs.rowTemplate.replace(/["]/g,'\\"');
                rowTemplate = rowTemplate.replace(/[']/g,"\\'");
                // Have to re-enclose in quotes before passing to compile directive
                // otherwise $parse will break when it tries to parse the expression
                scope.rowTemplate = "\"" + rowTemplate + "\"";

                // _id is default key used to determine uniqueness
                scope.key = scope.key || '_id';
                scope.options.forEach(function(opt){
                   opt.selected = false;
                });
                // initialize selected
                scope.$watchGroup(['baseModel','options'], function(newValues, oldValues){
                    var newBaseModel = newValues[0];
                    var newOptions = newValues[1];
                    if (newBaseModel && newOptions.length > 0) {
                        // first set all selected to false
                        scope.options.forEach(function(opt){
                            opt.selected = false;
                        });
                        var thisOption = _.find(scope.options, function(opts){
                            return opts[scope.key] === newBaseModel[scope.key]; });
                        if (thisOption){
                            thisOption.selected = true;
                        }
                    }
                });

                // Only allow object to be selected, not deselected
                scope.select = function(obj){
                    if (!obj.selected) {
                        obj.selected = true;
                        scope.baseModel = obj;
                    }
                }
            }
        }
    }
]);
